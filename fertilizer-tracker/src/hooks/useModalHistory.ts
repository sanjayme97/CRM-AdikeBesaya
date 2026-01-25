/**
 * Custom hook for handling browser back gesture with modals
 *
 * When a modal is open, pushing a history entry allows the back gesture
 * to close the modal instead of navigating away from the page.
 * Also updates global modal state to disable swipe navigation.
 */

import { useEffect, useRef, useCallback } from 'react';
import { useModalStore } from '../store/modalStore';

interface UseModalHistoryOptions {
  isOpen: boolean;
  onClose: () => void;
}

export function useModalHistory({ isOpen, onClose }: UseModalHistoryOptions) {
  const historyPushedRef = useRef(false);
  const setModalOpen = useModalStore((state) => state.setModalOpen);

  // Update global modal state when modal opens/closes
  useEffect(() => {
    setModalOpen(isOpen);
    return () => setModalOpen(false);
  }, [isOpen, setModalOpen]);

  // Handle back gesture/button
  useEffect(() => {
    const handlePopState = () => {
      if (historyPushedRef.current) {
        historyPushedRef.current = false;
        onClose();
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [onClose]);

  // Push history state when modal opens
  useEffect(() => {
    if (isOpen && !historyPushedRef.current) {
      window.history.pushState({ modal: true }, '');
      historyPushedRef.current = true;
    }
  }, [isOpen]);

  // Close modal and clean up history
  const closeWithHistory = useCallback(() => {
    if (historyPushedRef.current) {
      // Don't set ref to false here - let popstate handler do it
      window.history.back(); // This triggers popstate which calls onClose
    } else {
      onClose();
    }
  }, [onClose]);

  return { closeWithHistory };
}
