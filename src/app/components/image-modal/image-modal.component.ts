import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ImageService } from '../../services/image.service';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-image-modal',
  template: `
    <mat-card>
      <mat-card-header>
        <div mat-card-avatar class="example-header-image">
          <ng-container *ngIf="service.avatar$ | async as avatar">
            <img [src]="avatar.src" class="card-avatar" />
          </ng-container>
        </div>
        <mat-card-title>
          <mat-form-field appearance="fill">
            <mat-label>Title</mat-label>
            <input matInput [(ngModel)]="title" />
          </mat-form-field>
        </mat-card-title>
        <mat-card-subtitle>
          <mat-form-field appearance="fill">
            <mat-label>Subtitle</mat-label>
            <input matInput [(ngModel)]="description" />
          </mat-form-field>
        </mat-card-subtitle>
      </mat-card-header>
      <img mat-card-image [src]="data.image?.blobSrc || data.image?.assetSrc || data.image?.src" alt="image" />
      <mat-card-content>
        <p>
          <mat-form-field appearance="outline" style="width:100%">
            <mat-label>Description</mat-label>
            <textarea matInput rows="3" [(ngModel)]="description"></textarea>
          </mat-form-field>
        </p>
      </mat-card-content>
      <mat-card-actions>
        <button mat-button (click)="onClose()">Close</button>
        <button mat-button color="primary" (click)="onSave()">Save</button>
        <button mat-icon-button color="warn" aria-label="Delete" (click)="onDelete()">
          <mat-icon>delete</mat-icon>
        </button>
      </mat-card-actions>
    </mat-card>
  `
})
export class ImageModalComponent {
  public title: string = '';
  public description: string = '';
  constructor(@Inject(MAT_DIALOG_DATA) public data: any, private dialogRef: MatDialogRef<ImageModalComponent>, public service: ImageService, private snackBar: MatSnackBar) {
    this.title = data?.image?.title || '';
    this.description = data?.image?.description || '';
  }
  onClose() { this.dialogRef.close(); }
  async onDelete() {
    const id = this.data?.image?.id;
    if (!id) return;
    const ok = confirm('Delete this image?');
    if (!ok) return;
    await this.service.deleteImage(id);
    this.snackBar.open('Image deleted', 'OK', { duration: 2000 });
    this.dialogRef.close({ deleted: true, id });
  }
  async onSave() {
    const id = this.data?.image?.id;
    if (!id) return;
    const ok = await this.service.updateImageMetadata(id, this.title, this.description);
    if (ok) {
      this.snackBar.open('Image updated', 'OK', { duration: 2000 });
      this.dialogRef.close({ updated: true, id });
    } else {
      this.snackBar.open('Failed to update image', 'OK', { duration: 2000 });
    }
  }
}
