/**
 * Attendance Modal
 *
 * View mode: displays full attendance details + stops
 * Edit mode: admin can edit km/notes, add/delete stops
 */

import { useState, useEffect } from 'react';
import { formatCoordinates, getGoogleMapsUrl } from '../utils/distance';
import type { Attendance, AttendanceStop } from '../types';
import './AttendanceModal.css';

interface AttendanceModalProps {
  isOpen: boolean;
  mode: 'view' | 'edit';
  attendance: Attendance | null;
  stops: AttendanceStop[];
  isAdmin: boolean;
  onClose: () => void;
  onSave: (updates: Partial<Attendance>) => Promise<void>;
  onAddStop?: (stop: { attendanceId: string; stopOrder: number; stopTime: string; latitude: null; longitude: null; address: string; kmFromPrevious: number; isManualKm: boolean }) => Promise<void>;
  onDeleteStop?: (stopId: string) => Promise<void>;
  onUpdateStop?: (stopId: string, updates: { kmFromPrevious?: number; address?: string }) => Promise<void>;
}

export function AttendanceModal({ isOpen, mode, attendance, stops, isAdmin, onClose, onSave, onAddStop, onDeleteStop, onUpdateStop }: AttendanceModalProps) {
  const [kmTraveled, setKmTraveled] = useState('');
  const [travelNotes, setTravelNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Add stop form
  const [showAddStop, setShowAddStop] = useState(false);
  const [newStopKm, setNewStopKm] = useState('');
  const [newStopAddress, setNewStopAddress] = useState('');
  const [addingStop, setAddingStop] = useState(false);

  // Edit stop state: track which stop is being edited
  const [editingStopId, setEditingStopId] = useState<string | null>(null);
  const [editStopKm, setEditStopKm] = useState('');
  const [editStopAddress, setEditStopAddress] = useState('');

  const isReadOnly = mode === 'view';
  const canEdit = !isReadOnly && isAdmin;

  // Calculate total km from stops
  const stopsTotal = stops.reduce((sum, s) => sum + s.kmFromPrevious, 0);

  useEffect(() => {
    if (attendance && isOpen) {
      // Use stops total if stops exist, otherwise use attendance record value
      setKmTraveled(stops.length > 0 ? stopsTotal.toString() : attendance.kmTraveled.toString());
      setTravelNotes(attendance.travelNotes);
      setError(null);
      setShowAddStop(false);
      setNewStopKm('');
      setNewStopAddress('');
    }
  }, [attendance, isOpen, stops, stopsTotal]);

  if (!isOpen || !attendance) return null;

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

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await onSave({
        kmTraveled: stops.length > 0 ? stopsTotal : (parseFloat(kmTraveled) || 0),
        travelNotes,
      });
    } catch (err: any) {
      setError(err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleAddStop = async () => {
    if (!onAddStop || !newStopKm) return;
    setAddingStop(true);
    setError(null);
    try {
      await onAddStop({
        attendanceId: attendance.id,
        stopOrder: stops.length + 1,
        stopTime: new Date().toISOString(),
        latitude: null,
        longitude: null,
        address: newStopAddress,
        kmFromPrevious: parseFloat(newStopKm) || 0,
        isManualKm: true,
      });
      setNewStopKm('');
      setNewStopAddress('');
      setShowAddStop(false);
    } catch (err: any) {
      setError(err.message || 'Failed to add stop');
    } finally {
      setAddingStop(false);
    }
  };

  const handleDeleteStop = async (stopId: string) => {
    if (!onDeleteStop) return;
    if (!confirm('Delete this stop?')) return;
    setError(null);
    try {
      await onDeleteStop(stopId);
    } catch (err: any) {
      setError(err.message || 'Failed to delete stop');
    }
  };

  const startEditStop = (stop: AttendanceStop) => {
    setEditingStopId(stop.id);
    setEditStopKm(stop.kmFromPrevious.toString());
    setEditStopAddress(stop.address || '');
  };

  const cancelEditStop = () => {
    setEditingStopId(null);
    setEditStopKm('');
    setEditStopAddress('');
  };

  const handleUpdateStop = async () => {
    if (!onUpdateStop || !editingStopId) return;
    setError(null);
    try {
      await onUpdateStop(editingStopId, {
        kmFromPrevious: parseFloat(editStopKm) || 0,
        address: editStopAddress,
      });
      setEditingStopId(null);
      setEditStopKm('');
      setEditStopAddress('');
    } catch (err: any) {
      setError(err.message || 'Failed to update stop');
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content attendance-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">
            <h2>{attendance.displayId}</h2>
            <span className={`status-badge ${attendance.status}`}>
              {attendance.status === 'checked-in' ? 'Checked In' : 'Checked Out'}
            </span>
          </div>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>

        {error && <div className="modal-error">{error}</div>}

        <div className="modal-body">
          {/* Basic Info */}
          <div className="detail-grid">
            <div className="detail-item">
              <span className="detail-label">Date</span>
              <span className="detail-value">{formatDate(attendance.attendanceDate)}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Worker</span>
              <span className="detail-value">{attendance.userEmail}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Check In</span>
              <span className="detail-value">
                {formatTime(attendance.checkInTime)}
                {attendance.checkInLat && (
                  <a
                    href={getGoogleMapsUrl(attendance.checkInLat, attendance.checkInLng) || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="map-link"
                  >
                    ({formatCoordinates(attendance.checkInLat, attendance.checkInLng)})
                  </a>
                )}
              </span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Check Out</span>
              <span className="detail-value">
                {formatTime(attendance.checkOutTime)}
                {attendance.checkOutLat && (
                  <a
                    href={getGoogleMapsUrl(attendance.checkOutLat, attendance.checkOutLng) || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="map-link"
                  >
                    ({formatCoordinates(attendance.checkOutLat, attendance.checkOutLng)})
                  </a>
                )}
              </span>
            </div>
          </div>

          {/* Stops */}
          <div className="stops-section">
            <h3>Stops ({stops.length})</h3>
            {stops.length > 0 && (
              <div className="stops-list">
                {stops.map((stop) => (
                  <div key={stop.id} className="stop-row">
                    <span className="stop-num">{stop.stopOrder}</span>
                    <span className="stop-time">{formatTime(stop.stopTime)}</span>
                    {editingStopId === stop.id ? (
                      <>
                        <input
                          type="text"
                          value={editStopAddress}
                          onChange={(e) => setEditStopAddress(e.target.value)}
                          className="edit-stop-input address"
                          placeholder="Note"
                        />
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          value={editStopKm}
                          onChange={(e) => setEditStopKm(e.target.value)}
                          className="edit-stop-input km"
                        />
                        <button className="btn-save-stop" onClick={handleUpdateStop}>Save</button>
                        <button className="btn-cancel-stop" onClick={cancelEditStop}>&times;</button>
                      </>
                    ) : (
                      <>
                        <span className="stop-address">{stop.address || '—'}</span>
                        <span className="stop-km">{stop.kmFromPrevious} km</span>
                        {stop.latitude && (
                          <a
                            href={getGoogleMapsUrl(stop.latitude, stop.longitude) || '#'}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="map-link"
                          >
                            Map
                          </a>
                        )}
                        {stop.isManualKm && <span className="manual-badge">Manual</span>}
                        {canEdit && onUpdateStop && (
                          <button
                            className="btn-edit-stop"
                            onClick={() => startEditStop(stop)}
                            title="Edit stop"
                          >
                            &#9998;
                          </button>
                        )}
                        {canEdit && onDeleteStop && (
                          <button
                            className="btn-delete-stop"
                            onClick={() => handleDeleteStop(stop.id)}
                            title="Delete stop"
                          >
                            &times;
                          </button>
                        )}
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
            {stops.length === 0 && (
              <div className="no-stops">No stops recorded</div>
            )}

            {/* Add Stop (admin edit mode) */}
            {canEdit && onAddStop && (
              <>
                {showAddStop ? (
                  <div className="add-stop-form">
                    <div className="add-stop-row">
                      <div className="add-stop-field">
                        <label>Km *</label>
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          value={newStopKm}
                          onChange={(e) => setNewStopKm(e.target.value)}
                          placeholder="e.g. 12.5"
                        />
                      </div>
                      <div className="add-stop-field">
                        <label>Note</label>
                        <input
                          type="text"
                          value={newStopAddress}
                          onChange={(e) => setNewStopAddress(e.target.value)}
                          placeholder="e.g. Farm location"
                        />
                      </div>
                    </div>
                    <div className="add-stop-actions">
                      <button className="btn-save-small" onClick={handleAddStop} disabled={addingStop || !newStopKm}>
                        {addingStop ? 'Adding...' : 'Add'}
                      </button>
                      <button className="btn-cancel-small" onClick={() => { setShowAddStop(false); setNewStopKm(''); setNewStopAddress(''); }}>
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button className="btn-add-stop-modal" onClick={() => setShowAddStop(true)}>
                    + Add Stop
                  </button>
                )}
              </>
            )}
          </div>

          {/* Travel & Incentive */}
          <div className="travel-section">
            <h3>Travel & Incentive</h3>
            <div className="detail-grid">
              <div className="detail-item">
                <span className="detail-label">Total Km {stops.length > 0 ? '(auto from stops)' : ''}</span>
                {canEdit && stops.length === 0 ? (
                  <input
                    type="number"
                    step="0.1"
                    value={kmTraveled}
                    onChange={(e) => setKmTraveled(e.target.value)}
                    className="edit-input"
                  />
                ) : (
                  <span className="detail-value highlight">{stops.length > 0 ? stopsTotal : attendance.kmTraveled} km</span>
                )}
              </div>
              <div className="detail-item">
                <span className="detail-label">Rate/km</span>
                <span className="detail-value">{formatCurrency(attendance.incentiveRate)}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Incentive</span>
                <span className="detail-value highlight">{formatCurrency(attendance.incentiveAmount)}</span>
              </div>
              <div className="detail-item full-width">
                <span className="detail-label">Notes</span>
                {canEdit ? (
                  <input
                    type="text"
                    value={travelNotes}
                    onChange={(e) => setTravelNotes(e.target.value)}
                    className="edit-input"
                    placeholder="Travel notes"
                  />
                ) : (
                  <span className="detail-value">{attendance.travelNotes || '—'}</span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-cancel" onClick={onClose}>Close</button>
          {canEdit && (
            <button className="btn-save" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
