import { MoreHorizontal, Save, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/renderer/components/ui/alert-dialog';
import { Button } from '@/renderer/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/renderer/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/renderer/components/ui/dropdown-menu';
import { Input } from '@/renderer/components/ui/input';
import type { CameraPreset } from '../../types/camera';

interface PresetButtonProps {
  preset: CameraPreset;
  onRecall: (preset: number) => void;
  onStore: (preset: number) => void;
  onUpdate: (id: string, updates: Partial<Pick<CameraPreset, 'label' | 'cameraPreset'>>) => void;
  onDelete: (id: string) => void;
}

export const PresetButton = ({ preset, onRecall, onStore, onUpdate, onDelete }: PresetButtonProps) => {
  const [draftLabel, setDraftLabel] = useState(preset.label);
  const [editOpen, setEditOpen] = useState(false);
  const [storeOpen, setStoreOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  useEffect(() => {
    setDraftLabel(preset.label);
  }, [preset.label]);

  const commitChanges = () => {
    onUpdate(preset.id, { label: draftLabel });
  };

  const num = String(preset.cameraPreset).padStart(2, '0');

  return (
    <div className="preset-tile">
      <button
        type="button"
        className="preset-recall"
        aria-label={`Recall ${preset.label}`}
        onClick={() => onRecall(preset.cameraPreset)}
      />

      <div className="preset-tile-number">{num}</div>
      <div className="preset-tile-label">{preset.label}</div>

      <div className="preset-tile-actions">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="preset-menu-btn"
              aria-label={`Options for ${preset.label}`}
            >
              <MoreHorizontal size={13} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => setEditOpen(true)}>Edit</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setStoreOpen(true)}>Store position</DropdownMenuItem>
            <DropdownMenuItem variant="destructive" onSelect={() => setDeleteOpen(true)}>Remove</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit preset</DialogTitle>
          </DialogHeader>
          <form
            className="preset-dialog-form"
            onSubmit={(e) => { e.preventDefault(); commitChanges(); setEditOpen(false); }}
          >
            <label className="field">
              <span>Label</span>
              <Input value={draftLabel} maxLength={32} onChange={(e) => setDraftLabel(e.target.value)} />
            </label>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline" type="button">Cancel</Button>
              </DialogClose>
              <Button type="submit">Save</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={storeOpen} onOpenChange={setStoreOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Store camera position?</AlertDialogTitle>
            <AlertDialogDescription>
              Writes the current camera position to preset {preset.cameraPreset} ({preset.label}). This overwrites the preset on the camera.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => onStore(preset.cameraPreset)}>
              <Save size={14} />
              Store
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove preset?</AlertDialogTitle>
            <AlertDialogDescription>
              Removes {preset.label} from Panevo. Preset {preset.cameraPreset} stays on the camera.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={() => onDelete(preset.id)}>
              <Trash2 size={14} />
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
