/**
 * Attendance Page
 *
 * Top: Today's Status Card (check-in/out, add stops, km entry)
 * Bottom: Attendance records table (own records for workers, all for managers)
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { Layout } from '../components/Layout';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { AttendanceModal } from '../components/AttendanceModal';
import { useAuthStore } from '../store/authStore';
import { useGeolocation } from '../hooks/useGeolocation';
import { useOfflineSync } from '../hooks/useOfflineSync';
import { formatCoordinates, getGoogleMapsUrl, extractGpsFromPhoto } from '../utils/distance';
import {
  fetchAttendance,
  fetchTodayAttendance,
  createAttendance,
  updateAttendance,
  fetchAttendanceStops,
  createAttendanceStop,
  deleteAttendanceStop,
  updateAttendanceStop,
  fetchIncentiveRate,
  updateIncentiveRate,
  fetchAttendanceSummary,
  fetchUsers,
} from '../services/backend';
import type { Attendance, AttendanceStop, AttendanceFilters, AttendanceSummary } from '../types';
import './AttendancePage.css';

type ModalMode = 'view' | 'edit';

export function AttendancePage() {
  const { user } = useAuthStore();
  const { getCurrentPosition, loading: gpsLoading, error: gpsError } = useGeolocation();
  const { queueAction, pendingCount, isOnline } = useOfflineSync();

  // Today's attendance state
  const [todayAttendance, setTodayAttendance] = useState<Attendance | null>(null);
  const [todayStops, setTodayStops] = useState<AttendanceStop[]>([]);
  const [checkingIn, setCheckingIn] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);
  const [addingStop, setAddingStop] = useState(false);

  // Stop form
  const [stopNote, setStopNote] = useState('');
  const [stopKm, setStopKm] = useState('');
  const [showStopForm, setShowStopForm] = useState(false);

  // Checkout form
  const [checkoutKm, setCheckoutKm] = useState('');
  const [checkoutNotes, setCheckoutNotes] = useState('');
  const [showCheckoutForm, setShowCheckoutForm] = useState(false);

  // Photo capture
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [photoAction, setPhotoAction] = useState<'check-in' | 'stop' | 'check-out' | null>(null);
  const [capturedPhoto, setCapturedPhoto] = useState<File | null>(null);
  const [photoGps, setPhotoGps] = useState<{ latitude: number; longitude: number } | null>(null);

  // Records list
  const [records, setRecords] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterUser, setFilterUser] = useState('');
  const [users, setUsers] = useState<Array<{ email: string; role: string }>>([]);

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>('view');
  const [selectedRecord, setSelectedRecord] = useState<Attendance | null>(null);
  const [selectedStops, setSelectedStops] = useState<AttendanceStop[]>([]);

  // Incentive config (admin)
  const [incentiveRate, setIncentiveRate] = useState<number>(3.0);
  const [editingRate, setEditingRate] = useState(false);
  const [newRate, setNewRate] = useState('');

  // Summary
  const [summary, setSummary] = useState<AttendanceSummary | null>(null);

  const isManager = user?.role === 'Manager' || user?.role === 'Admin';
  const isAdmin = user?.role === 'Admin';

  // Load today's attendance and records
  const loadData = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      setError(null);

      const filters: AttendanceFilters = {};
      if (!isManager) {
        filters.userEmail = user.email;
      } else if (filterUser) {
        filters.userEmail = filterUser;
      }
      if (filterDateFrom) filters.dateFrom = filterDateFrom;
      if (filterDateTo) filters.dateTo = filterDateTo;
      if (filterStatus) filters.status = filterStatus;

      const [todayData, recordsData, rate, usersData] = await Promise.all([
        fetchTodayAttendance(user.email),
        fetchAttendance(100, 0, filters),
        fetchIncentiveRate(),
        isManager ? fetchUsers() : Promise.resolve([]),
      ]);

      setTodayAttendance(todayData);
      setRecords(recordsData);
      setIncentiveRate(rate);
      if (isManager) setUsers(usersData);

      // Load today's stops if checked in
      if (todayData) {
        const stops = await fetchAttendanceStops(todayData.id);
        setTodayStops(stops);
      }

      // Load summary for current month
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toLocaleDateString('en-CA');
      const monthEnd = now.toLocaleDateString('en-CA');
      const summaryData = await fetchAttendanceSummary(
        isManager ? filterUser || undefined : user.email,
        monthStart,
        monthEnd
      );
      setSummary(summaryData);
    } catch (err: any) {
      setError(err.message || 'Failed to load attendance data');
    } finally {
      setLoading(false);
    }
  }, [user, isManager, filterDateFrom, filterDateTo, filterStatus, filterUser]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Get GPS — try photo EXIF first, fallback to browser geolocation
  const getLocation = useCallback(async (): Promise<{ latitude: number; longitude: number } | null> => {
    // If we have GPS from a photo, use that
    if (photoGps) {
      const gps = photoGps;
      setPhotoGps(null);
      return gps;
    }
    // Fallback to browser geolocation
    return getCurrentPosition();
  }, [photoGps, getCurrentPosition]);

  // Handle photo capture
  const handlePhotoCapture = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCapturedPhoto(file);

    // Try to extract GPS from EXIF
    const gps = await extractGpsFromPhoto(file);
    if (gps) {
      setPhotoGps(gps);
    }

    // Reset file input for next use
    if (photoInputRef.current) {
      photoInputRef.current.value = '';
    }
  }, []);

  // Open camera for a specific action
  const openCamera = useCallback((action: 'check-in' | 'stop' | 'check-out') => {
    setPhotoAction(action);
    setCapturedPhoto(null);
    setPhotoGps(null);
    photoInputRef.current?.click();
  }, []);

  // CHECK IN
  const handleCheckIn = useCallback(async () => {
    if (!user || todayAttendance) return;
    setCheckingIn(true);

    try {
      const location = await getLocation();
      const today = new Date().toLocaleDateString('en-CA');
      const now = new Date().toISOString();

      const data = {
        userEmail: user.email,
        attendanceDate: today,
        checkInTime: now,
        checkInLat: location?.latitude ?? null,
        checkInLng: location?.longitude ?? null,
        checkInAddress: '',
        checkOutTime: null,
        checkOutLat: null,
        checkOutLng: null,
        checkOutAddress: '',
        kmTraveled: 0,
        travelNotes: '',
        incentiveRate: null,
        status: 'checked-in' as const,
      };

      if (!isOnline) {
        queueAction('check-in', data);
        setTodayAttendance({
          ...data,
          id: crypto.randomUUID(),
          rowNumber: 0,
          displayId: 'ATT-PEND',
          incentiveAmount: null,
          createdAt: now,
          lastUpdated: now,
          isDeleted: false,
        });
      } else {
        const created = await createAttendance(data);
        setTodayAttendance(created);
      }
      setCapturedPhoto(null);
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to check in');
    } finally {
      setCheckingIn(false);
    }
  }, [user, todayAttendance, getLocation, isOnline, queueAction, loadData]);

  // ADD STOP
  const handleAddStop = useCallback(async () => {
    if (!user || !todayAttendance) return;
    setAddingStop(true);

    try {
      const location = await getLocation();
      const now = new Date().toISOString();
      const nextOrder = todayStops.length + 1;

      const stopData = {
        attendanceId: todayAttendance.id,
        stopOrder: nextOrder,
        stopTime: now,
        latitude: location?.latitude ?? null,
        longitude: location?.longitude ?? null,
        address: stopNote,
        kmFromPrevious: parseFloat(stopKm) || 0,
        isManualKm: true,
      };

      if (!isOnline) {
        queueAction('add-stop', stopData);
      } else {
        const created = await createAttendanceStop(stopData);
        setTodayStops(prev => [...prev, created]);

        // Update total km on attendance
        const totalKm = [...todayStops, created].reduce((sum, s) => sum + s.kmFromPrevious, 0);
        await updateAttendance(todayAttendance.id, { kmTraveled: totalKm });
      }

      setStopNote('');
      setStopKm('');
      setShowStopForm(false);
      setCapturedPhoto(null);
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to add stop');
    } finally {
      setAddingStop(false);
    }
  }, [user, todayAttendance, todayStops, stopNote, stopKm, getLocation, isOnline, queueAction, loadData]);

  // CHECK OUT
  const handleCheckOut = useCallback(async () => {
    if (!user || !todayAttendance || todayAttendance.status === 'checked-out') return;
    setCheckingOut(true);

    try {
      const location = await getLocation();
      const now = new Date().toISOString();
      const totalKm = todayStops.reduce((sum, s) => sum + s.kmFromPrevious, 0) + (parseFloat(checkoutKm) || 0);

      const updates: Partial<Attendance> = {
        checkOutTime: now,
        checkOutLat: location?.latitude ?? null,
        checkOutLng: location?.longitude ?? null,
        checkOutAddress: '',
        kmTraveled: totalKm,
        travelNotes: checkoutNotes,
        incentiveRate: incentiveRate,
        status: 'checked-out',
      };

      // If there's additional km at checkout, add it as a final stop
      if (parseFloat(checkoutKm) > 0) {
        const finalStop = {
          attendanceId: todayAttendance.id,
          stopOrder: todayStops.length + 1,
          stopTime: now,
          latitude: location?.latitude ?? null,
          longitude: location?.longitude ?? null,
          address: 'Checkout',
          kmFromPrevious: parseFloat(checkoutKm),
          isManualKm: true,
        };

        if (isOnline) {
          await createAttendanceStop(finalStop);
        }
      }

      if (!isOnline) {
        queueAction('check-out', { id: todayAttendance.id, ...updates });
      } else {
        await updateAttendance(todayAttendance.id, updates);
      }

      setShowCheckoutForm(false);
      setCheckoutKm('');
      setCheckoutNotes('');
      setCapturedPhoto(null);
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to check out');
    } finally {
      setCheckingOut(false);
    }
  }, [user, todayAttendance, todayStops, checkoutKm, checkoutNotes, incentiveRate, getLocation, isOnline, queueAction, loadData]);

  // Update incentive rate (admin)
  const handleUpdateRate = useCallback(async () => {
    if (!user || !isAdmin) return;
    const rate = parseFloat(newRate);
    if (isNaN(rate) || rate <= 0) return;

    try {
      await updateIncentiveRate(rate, user.email);
      setIncentiveRate(rate);
      setEditingRate(false);
      setNewRate('');
    } catch (err: any) {
      setError(err.message || 'Failed to update rate');
    }
  }, [user, isAdmin, newRate]);

  // View record in modal (admin gets edit mode)
  const handleViewRecord = useCallback(async (record: Attendance) => {
    try {
      const stops = await fetchAttendanceStops(record.id);
      setSelectedRecord(record);
      setSelectedStops(stops);
      setModalMode(isAdmin ? 'edit' : 'view');
      setModalOpen(true);
    } catch (err: any) {
      setError(err.message || 'Failed to load record details');
    }
  }, [isAdmin]);

  const formatTime = (isoString: string | null) => {
    if (!isoString) return '—';
    return new Date(isoString).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const formatCurrency = (amount: number | null) => {
    if (amount == null) return '—';
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);
  };

  if (loading && records.length === 0) {
    return (
      <Layout>
        <LoadingSpinner />
      </Layout>
    );
  }

  const todayStatus = todayAttendance?.status;

  return (
    <Layout>
      <div className="attendance-page">
        {/* Hidden file input for camera */}
        <input
          ref={photoInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handlePhotoCapture}
          style={{ display: 'none' }}
        />

        {/* Page Header */}
        <div className="page-header">
          <h1>Attendance</h1>
          {pendingCount > 0 && (
            <span className="pending-badge">
              {pendingCount} pending sync
            </span>
          )}
          {!isOnline && <span className="offline-badge">Offline</span>}
        </div>

        {error && <div className="error-banner">{error}</div>}
        {gpsError && <div className="warning-banner">{gpsError}</div>}

        {/* Today's Status Card */}
        <div className="today-card">
          <h2>Today — {formatDate(new Date().toLocaleDateString('en-CA'))}</h2>

          {!todayStatus && (
            <div className="checkin-section">
              <p>You have not checked in today.</p>
              <div className="checkin-actions">
                <button
                  className="btn-checkin"
                  onClick={handleCheckIn}
                  disabled={checkingIn || gpsLoading}
                >
                  {checkingIn ? 'Checking in...' : 'Check In'}
                </button>
                <button
                  className="btn-photo"
                  onClick={() => openCamera('check-in')}
                  disabled={checkingIn}
                >
                  Take Photo
                </button>
              </div>
              {capturedPhoto && photoAction === 'check-in' && (
                <div className="photo-preview">
                  Photo captured {photoGps ? `(GPS: ${formatCoordinates(photoGps.latitude, photoGps.longitude)})` : '(No GPS in photo)'}
                </div>
              )}
            </div>
          )}

          {todayStatus === 'checked-in' && todayAttendance && (
            <div className="active-day">
              <div className="status-row">
                <span className="status-badge checked-in">Checked In</span>
                <span className="check-time">at {formatTime(todayAttendance.checkInTime)}</span>
                {todayAttendance.checkInLat && (
                  <a
                    href={getGoogleMapsUrl(todayAttendance.checkInLat, todayAttendance.checkInLng) || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="location-link"
                  >
                    View Location
                  </a>
                )}
              </div>

              {/* Stops Timeline */}
              {todayStops.length > 0 && (
                <div className="stops-timeline">
                  <h3>Stops ({todayStops.length})</h3>
                  {todayStops.map((stop) => (
                    <div key={stop.id} className="stop-item">
                      <div className="stop-marker">{stop.stopOrder}</div>
                      <div className="stop-details">
                        <span className="stop-time">{formatTime(stop.stopTime)}</span>
                        {stop.address && <span className="stop-address">{stop.address}</span>}
                        <span className="stop-km">{stop.kmFromPrevious} km</span>
                        {stop.latitude && (
                          <a
                            href={getGoogleMapsUrl(stop.latitude, stop.longitude) || '#'}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="location-link small"
                          >
                            Map
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                  <div className="total-km-so-far">
                    Total so far: {todayStops.reduce((sum, s) => sum + s.kmFromPrevious, 0).toFixed(1)} km
                  </div>
                </div>
              )}

              {/* Add Stop Form */}
              {showStopForm ? (
                <div className="stop-form">
                  <h3>Add Stop</h3>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Km from previous stop *</label>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        value={stopKm}
                        onChange={(e) => setStopKm(e.target.value)}
                        placeholder="e.g. 12.5"
                      />
                    </div>
                    <div className="form-group">
                      <label>Note (optional)</label>
                      <input
                        type="text"
                        value={stopNote}
                        onChange={(e) => setStopNote(e.target.value)}
                        placeholder="e.g. Ramesh's farm"
                      />
                    </div>
                  </div>
                  <div className="form-actions">
                    <button
                      className="btn-photo"
                      onClick={() => openCamera('stop')}
                      disabled={addingStop}
                    >
                      Take Photo
                    </button>
                    {capturedPhoto && photoAction === 'stop' && (
                      <span className="photo-status">
                        Photo ready {photoGps ? '(GPS found)' : ''}
                      </span>
                    )}
                    <button
                      className="btn-save"
                      onClick={handleAddStop}
                      disabled={addingStop || !stopKm}
                    >
                      {addingStop ? 'Adding...' : 'Add Stop'}
                    </button>
                    <button className="btn-cancel" onClick={() => { setShowStopForm(false); setStopKm(''); setStopNote(''); }}>
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button className="btn-add-stop" onClick={() => setShowStopForm(true)}>
                  + Add Stop
                </button>
              )}

              {/* Checkout Form */}
              {showCheckoutForm ? (
                <div className="checkout-form">
                  <h3>Check Out</h3>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Additional km (from last stop to end)</label>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        value={checkoutKm}
                        onChange={(e) => setCheckoutKm(e.target.value)}
                        placeholder="e.g. 5.0"
                      />
                    </div>
                    <div className="form-group">
                      <label>Notes (optional)</label>
                      <input
                        type="text"
                        value={checkoutNotes}
                        onChange={(e) => setCheckoutNotes(e.target.value)}
                        placeholder="Any notes for the day"
                      />
                    </div>
                  </div>
                  <div className="form-actions">
                    <button
                      className="btn-photo"
                      onClick={() => openCamera('check-out')}
                      disabled={checkingOut}
                    >
                      Take Photo
                    </button>
                    {capturedPhoto && photoAction === 'check-out' && (
                      <span className="photo-status">
                        Photo ready {photoGps ? '(GPS found)' : ''}
                      </span>
                    )}
                    <button
                      className="btn-checkout"
                      onClick={handleCheckOut}
                      disabled={checkingOut}
                    >
                      {checkingOut ? 'Checking out...' : 'Check Out'}
                    </button>
                    <button className="btn-cancel" onClick={() => { setShowCheckoutForm(false); setCheckoutKm(''); setCheckoutNotes(''); }}>
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button className="btn-checkout" onClick={() => setShowCheckoutForm(true)}>
                  Check Out
                </button>
              )}
            </div>
          )}

          {todayStatus === 'checked-out' && todayAttendance && (
            <div className="completed-day">
              <div className="status-badge checked-out">Checked Out</div>
              <div className="day-summary">
                <div className="summary-item">
                  <span className="label">Check In</span>
                  <span className="value">{formatTime(todayAttendance.checkInTime)}</span>
                </div>
                <div className="summary-item">
                  <span className="label">Check Out</span>
                  <span className="value">{formatTime(todayAttendance.checkOutTime)}</span>
                </div>
                <div className="summary-item">
                  <span className="label">Stops</span>
                  <span className="value">{todayStops.length}</span>
                </div>
                <div className="summary-item">
                  <span className="label">Total Km</span>
                  <span className="value">{todayAttendance.kmTraveled} km</span>
                </div>
                <div className="summary-item">
                  <span className="label">Incentive</span>
                  <span className="value">{formatCurrency(todayAttendance.incentiveAmount)}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Monthly Summary */}
        {summary && (
          <div className="summary-bar">
            <div className="summary-stat">
              <span className="stat-value">{summary.totalDays}</span>
              <span className="stat-label">Days this month</span>
            </div>
            <div className="summary-stat">
              <span className="stat-value">{summary.totalKm}</span>
              <span className="stat-label">Total Km</span>
            </div>
            <div className="summary-stat">
              <span className="stat-value">{summary.averageKmPerDay}</span>
              <span className="stat-label">Avg Km/day</span>
            </div>
            <div className="summary-stat">
              <span className="stat-value">{formatCurrency(summary.totalIncentive)}</span>
              <span className="stat-label">Total Incentive</span>
            </div>
          </div>
        )}

        {/* Admin: Incentive Rate Config */}
        {isAdmin && (
          <div className="config-section">
            <span className="config-label">
              Incentive Rate: {formatCurrency(incentiveRate)}/km
            </span>
            {editingRate ? (
              <div className="rate-edit">
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  value={newRate}
                  onChange={(e) => setNewRate(e.target.value)}
                  placeholder="New rate"
                />
                <button className="btn-save-small" onClick={handleUpdateRate}>Save</button>
                <button className="btn-cancel-small" onClick={() => setEditingRate(false)}>Cancel</button>
              </div>
            ) : (
              <button className="btn-edit-rate" onClick={() => { setEditingRate(true); setNewRate(incentiveRate.toString()); }}>
                Change Rate
              </button>
            )}
          </div>
        )}

        {/* Filters */}
        <div className="filters-section">
          <div className="filter-row">
            <div className="filter-group">
              <label>From</label>
              <input type="date" value={filterDateFrom} onChange={(e) => setFilterDateFrom(e.target.value)} />
            </div>
            <div className="filter-group">
              <label>To</label>
              <input type="date" value={filterDateTo} onChange={(e) => setFilterDateTo(e.target.value)} />
            </div>
            <div className="filter-group">
              <label>Status</label>
              <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                <option value="">All</option>
                <option value="checked-in">Checked In</option>
                <option value="checked-out">Checked Out</option>
              </select>
            </div>
            {isManager && (
              <div className="filter-group">
                <label>Worker</label>
                <select value={filterUser} onChange={(e) => setFilterUser(e.target.value)}>
                  <option value="">All Workers</option>
                  {users.map((u) => (
                    <option key={u.email} value={u.email}>{u.email}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Records Table */}
        <div className="records-section">
          <h2>Attendance Records</h2>

          {/* Desktop Table */}
          <div className="table-container desktop-only">
            <table className="records-table">
              <thead>
                <tr>
                  <th>Date</th>
                  {isManager && <th>Worker</th>}
                  <th>Check In</th>
                  <th>Check Out</th>
                  <th>Stops</th>
                  <th>Km</th>
                  <th>Incentive</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {records.map((record) => (
                  <tr key={record.id} onClick={() => handleViewRecord(record)} className="clickable-row">
                    <td>{formatDate(record.attendanceDate)}</td>
                    {isManager && <td>{record.userEmail}</td>}
                    <td>{formatTime(record.checkInTime)}</td>
                    <td>{formatTime(record.checkOutTime)}</td>
                    <td>—</td>
                    <td>{record.kmTraveled}</td>
                    <td>{formatCurrency(record.incentiveAmount)}</td>
                    <td>
                      <span className={`status-badge ${record.status}`}>
                        {record.status === 'checked-in' ? 'In' : 'Out'}
                      </span>
                    </td>
                  </tr>
                ))}
                {records.length === 0 && (
                  <tr>
                    <td colSpan={isManager ? 8 : 7} className="no-data">
                      No attendance records found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="cards-container mobile-only">
            {records.map((record) => (
              <div key={record.id} className="record-card" onClick={() => handleViewRecord(record)}>
                <div className="card-header">
                  <span className="card-date">{formatDate(record.attendanceDate)}</span>
                  <span className={`status-badge ${record.status}`}>
                    {record.status === 'checked-in' ? 'In' : 'Out'}
                  </span>
                </div>
                {isManager && <div className="card-worker">{record.userEmail}</div>}
                <div className="card-details">
                  <span>{formatTime(record.checkInTime)} - {formatTime(record.checkOutTime)}</span>
                  <span>{record.kmTraveled} km</span>
                  <span>{formatCurrency(record.incentiveAmount)}</span>
                </div>
              </div>
            ))}
            {records.length === 0 && (
              <div className="no-data">No attendance records found</div>
            )}
          </div>
        </div>

        {/* View/Edit Modal */}
        {modalOpen && (
          <AttendanceModal
            isOpen={modalOpen}
            mode={modalMode}
            attendance={selectedRecord}
            stops={selectedStops}
            isAdmin={isAdmin}
            onClose={() => setModalOpen(false)}
            onSave={async (updates) => {
              if (selectedRecord) {
                await updateAttendance(selectedRecord.id, updates);
                await loadData();
              }
              setModalOpen(false);
            }}
            onAddStop={async (stopData) => {
              await createAttendanceStop(stopData);
              // Reload stops for the modal
              if (selectedRecord) {
                const updatedStops = await fetchAttendanceStops(selectedRecord.id);
                setSelectedStops(updatedStops);
                // Update total km
                const totalKm = updatedStops.reduce((sum, s) => sum + s.kmFromPrevious, 0);
                await updateAttendance(selectedRecord.id, { kmTraveled: totalKm });
              }
            }}
            onDeleteStop={async (stopId) => {
              await deleteAttendanceStop(stopId);
              if (selectedRecord) {
                const updatedStops = await fetchAttendanceStops(selectedRecord.id);
                setSelectedStops(updatedStops);
                const totalKm = updatedStops.reduce((sum, s) => sum + s.kmFromPrevious, 0);
                await updateAttendance(selectedRecord.id, { kmTraveled: totalKm });
                await loadData();
              }
            }}
            onUpdateStop={async (stopId, updates) => {
              await updateAttendanceStop(stopId, updates);
              if (selectedRecord) {
                const updatedStops = await fetchAttendanceStops(selectedRecord.id);
                setSelectedStops(updatedStops);
                const totalKm = updatedStops.reduce((sum, s) => sum + s.kmFromPrevious, 0);
                await updateAttendance(selectedRecord.id, { kmTraveled: totalKm });
                await loadData();
              }
            }}
          />
        )}
      </div>
    </Layout>
  );
}
