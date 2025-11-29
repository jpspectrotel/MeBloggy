import { Component } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { UploadDialogComponent } from '../upload-dialog/upload-dialog.component';
import { AvatarDialogComponent } from '../avatar-dialog/avatar-dialog.component';
import { ImageService } from '../../services/image.service';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css']
})
export class HeaderComponent {
  constructor(public imageService: ImageService, private dialog: MatDialog) {}

  async onFileSelected(event: any) {
    const file: File = event.target.files && event.target.files[0];
    if (file) {
      const preview = URL.createObjectURL(file);
      // Open an upload dialog to choose the showcase
      const ref = this.dialog.open(UploadDialogComponent, { data: { file, preview }, width: '80%' });
      await ref.afterClosed().toPromise();
    }
    event.target.value = '';
  }

  openAvatarDialog() {
    const ref = this.dialog.open(AvatarDialogComponent, { data: { preview: this.imageService.avatar$.value?.src }, width: '320px' });
    ref.afterClosed().subscribe(() => {
      // nothing required, avatar$ will update via ImageService
    });
  }
}
