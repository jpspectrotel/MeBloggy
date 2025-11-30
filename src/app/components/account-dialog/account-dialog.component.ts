import { Component, Inject, OnInit, OnDestroy } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ImageService } from '../../services/image.service';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-account-dialog',
  templateUrl: './account-dialog.component.html',
  styleUrls: ['./account-dialog.component.css']
})
export class AccountDialogComponent implements OnInit, OnDestroy {
  public preview?: string;
  public file?: File;
  public showcases: any[] = [];
  public selectedShowcaseIds: Set<string> = new Set();
  private _subs: any[] = [];
  public saving = false;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: any,
    private dialogRef: MatDialogRef<AccountDialogComponent>,
    public service: ImageService,
    private snackBar: MatSnackBar
  ) {
    this.preview = data?.preview;
  }

  ngOnInit(): void {
    // subscribe to avatar changes so the dialog preview updates if avatar changes elsewhere
    this._subs.push(this.service.avatar$.subscribe(v => {
      if (v && v.src) this.preview = v.src;
    }));
    // subscribe to showcases updates
    this._subs.push(this.service.showcases$.subscribe(showcases => {
      this.showcases = showcases || [];
      // If selectedShowcaseIds is empty, select all by default
      if (this.selectedShowcaseIds.size === 0 && this.showcases.length) {
        this.showcases.forEach(s => this.selectedShowcaseIds.add(s.id));
      } else {
        // Remove deselected showcases that no longer exist
        const validIds = new Set(this.showcases.map(s => s.id));
        this.selectedShowcaseIds.forEach(id => {
          if (!validIds.has(id)) this.selectedShowcaseIds.delete(id);
        });
        // Add new showcases as selected
        this.showcases.forEach(s => {
          if (!this.selectedShowcaseIds.has(s.id)) this.selectedShowcaseIds.add(s.id);
        });
      }
    }));
  }

  ngOnDestroy(): void {
    this._subs.forEach(sub => sub.unsubscribe());
  }

  onFileSelected(event: any) {
    const file = event.target.files && event.target.files[0];
    if (file) {
      this.file = file;
      this.preview = URL.createObjectURL(file);
    }
  }

  async save() {
    if (!this.file) return;
    this.saving = true;
    const ok = await this.service.setAvatar(this.file);
    if (ok) {
      // refresh the preview from the service so the modal shows the most recently saved avatar if reopened
      const src = this.service.avatar$.value?.src;
      this.preview = src || this.preview;
      this.service.avatarError$.next(null);
      this.snackBar.open('Avatar updated', 'OK', { duration: 2000 });
      this.dialogRef.close(true);
    } else {
      const msg = this.service.avatarError$.value || 'Failed to save avatar';
      this.snackBar.open(msg, 'OK', { duration: 4000 });
    }
    this.saving = false;
  }

  toggleShowcaseSelection(id: string) {
    if (this.selectedShowcaseIds.has(id)) {
      this.selectedShowcaseIds.delete(id);
    } else {
      this.selectedShowcaseIds.add(id);
    }
    // Optionally, emit an event or update a service to sync with home page
    if (this.service.selectedShowcaseIds$) {
      this.service.selectedShowcaseIds$.next(Array.from(this.selectedShowcaseIds));
    }
  }

  close() { this.dialogRef.close(false); }
  async onRemove() {
    const ok = confirm('Remove avatar?');
    if (!ok) return;
    const r = await this.service.removeAvatar();
    if (r) {
      this.snackBar.open('Avatar removed', 'OK', { duration: 2000 });
      this.dialogRef.close(true);
    } else {
      this.snackBar.open('Failed to remove avatar', 'OK', { duration: 2000 });
    }
  }
}
