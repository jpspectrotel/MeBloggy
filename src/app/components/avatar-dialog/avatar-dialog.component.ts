import { Component, Inject, OnInit, OnDestroy } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ImageService } from '../../services/image.service';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-avatar-dialog',
  templateUrl: './avatar-dialog.component.html',
  styleUrls: ['./avatar-dialog.component.css']
})
export class AvatarDialogComponent implements OnInit, OnDestroy {
  public preview?: string;
  public file?: File;

  private _sub: any;
  public saving = false;
  constructor(@Inject(MAT_DIALOG_DATA) public data: any,
    private dialogRef: MatDialogRef<AvatarDialogComponent>,
    public service: ImageService, private snackBar: MatSnackBar) {
    this.preview = data?.preview;
  }

  ngOnInit(): void {
    // subscribe to avatar changes so the dialog preview updates if avatar changes elsewhere
    this._sub = this.service.avatar$.subscribe(v => {
      if (v && v.src) this.preview = v.src;
    });
  }

  ngOnDestroy(): void {
    if (this._sub) this._sub.unsubscribe();
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
