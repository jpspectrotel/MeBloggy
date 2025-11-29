import { Component, Inject, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
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
          <mat-form-field appearance="fill" style="width:100%;">
            <mat-label>Title</mat-label>
            <input matInput [(ngModel)]="title" #titleInput />
          </mat-form-field>
        </mat-card-title>
      </mat-card-header>
      <div style="width:100%;margin-top:10px;">
        <mat-form-field appearance="fill" style="width:100%;">
          <mat-label>Showcase</mat-label>
          <mat-select [(ngModel)]="selectedShowcase">
            <mat-option *ngFor="let s of showcases" [value]="s.id">{{s.title}}</mat-option>
            <mat-option [value]="'__create__'">Create new...</mat-option>
          </mat-select>
        </mat-form-field>
        <div *ngIf="selectedShowcase === '__create__'" style="margin-top:6px;">
          <mat-form-field style="width:100%">
            <mat-label>New showcase name</mat-label>
            <input matInput [(ngModel)]="newShowcaseName" />
          </mat-form-field>
        </div>
      </div>
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
        <button mat-button color="primary" (click)="onSave()" [disabled]="selectedShowcase === '__create__' && !newShowcaseName">Save</button>
        <button mat-icon-button color="warn" aria-label="Delete" (click)="onDelete()">
          <mat-icon>delete</mat-icon>
        </button>
      </mat-card-actions>
    </mat-card>
  `
})

export class ImageModalComponent implements AfterViewInit {
  public title: string = '';
  public description: string = '';
  public showcases: any[] = [];
  public selectedShowcase: string | null = null;
  public newShowcaseName: string = '';
  @ViewChild('titleInput') titleInput!: ElementRef<HTMLInputElement>;
  constructor(@Inject(MAT_DIALOG_DATA) public data: any, private dialogRef: MatDialogRef<ImageModalComponent>, public service: ImageService, private snackBar: MatSnackBar) {
    this.title = data?.image?.title || '';
    this.description = data?.image?.description || '';
    this.service.showcases$.subscribe(s => { this.showcases = s || []; });
    // Set initial selected showcase
    if (data?.image) {
      const found = this.showcases.find(s => s.images && s.images.some((img: any) => img.id === data.image.id));
      this.selectedShowcase = found ? found.id : (this.showcases[0]?.id || null);
    }
  }
  ngAfterViewInit() {
    setTimeout(() => {
      if (this.titleInput) {
        this.titleInput.nativeElement.select();
      }
    }, 0);
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
    // If creating a new showcase, create it first
    let targetShowcase = this.selectedShowcase;
    if (this.selectedShowcase === '__create__' && this.newShowcaseName) {
      const newId = await this.service.createShowcase(this.newShowcaseName);
      if (newId) targetShowcase = newId;
    }
    // Remove image from all showcases and persist
    for (const s of this.showcases) {
      if (s.images) {
        s.images = s.images.filter((img: any) => img.id !== id);
        // Persist showcase update
        await this.service.db.put('showcases', { id: s.id, title: s.title, images: s.images.map((img: any) => img.id) });
      }
    }
    // Add image to target showcase and persist
    const target = this.showcases.find(s => s.id === targetShowcase);
    if (target) {
      target.images = target.images || [];
      target.images.unshift({ id });
      await this.service.db.put('showcases', { id: target.id, title: target.title, images: target.images.map((img: any) => img.id) });
    }
    // Update metadata
    const ok = await this.service.updateImageMetadata(id, this.title, this.description);
    if (ok) {
      this.snackBar.open('Image updated', 'OK', { duration: 2000 });
      this.dialogRef.close({ updated: true, id });
    } else {
      this.snackBar.open('Failed to update image', 'OK', { duration: 2000 });
    }
  }
}
