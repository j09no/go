
import React from 'react';
import { X } from 'lucide-react';

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  itemName?: string;
}

export function DeleteConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  itemName
}: DeleteConfirmationModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="delete-confirmation-card">
        <button onClick={onClose} className="exit-button">
          <X size={20} />
        </button>
        
        <div className="card-content">
          <h3 className="card-heading">{title}</h3>
          <p className="card-description">
            {description}
            {itemName && <span className="font-semibold text-red-600"> "{itemName}"</span>}
          </p>
        </div>
        
        <div className="card-button-wrapper">
          <button onClick={onClose} className="card-button secondary">
            Cancel
          </button>
          <button onClick={onConfirm} className="card-button primary">
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
