import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ImageService } from '../../services/image.service';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-upload-dialog',
  templateUrl: './upload-dialog.component.html',
  styleUrls: ['./upload-dialog.component.css']
})
export class UploadDialogComponent implements OnInit {
  public showcases: any[] = [];
  public selectedShowcase: string | null = null;
  public creatingNew = false;
  public newShowcaseName = '';

  constructor(@Inject(MAT_DIALOG_DATA) public data: any,
    private dialogRef: MatDialogRef<UploadDialogComponent>,
    private service: ImageService, private snackBar: MatSnackBar) {
    this.service.showcases$.subscribe(s => { this.showcases = s || []; });
    // initialize defaults
    if (this.data) {
      this.data.title = this.data.title || (this.data.file && this.data.file.name) || '';
      this.data.description = this.data.description || '';
    }
  }

  ngOnInit() {
    // set the default based on last used showcase (localStorage) if present
    const last = localStorage.getItem('mebloggy.lastShowcase');
    if (last) this.selectedShowcase = last;
    // ensure if it's not in list, fallback to first one after subscription arrives
    this.service.showcases$.subscribe(s => {
      if (!this.selectedShowcase && s && s.length) this.selectedShowcase = s[0].id;
      if (this.selectedShowcase && !s.find(x => x.id === this.selectedShowcase)) {
        if (s && s.length) this.selectedShowcase = s[0].id;
      }
    });
  }

  onSelectChange(value: any) {
    // when the user chooses the 'create new' option, toggle the input display
    if (value === '__create__') {
      this.creatingNew = true;
      this.newShowcaseName = '';
    } else {
      this.creatingNew = false;
      this.newShowcaseName = '';
    }
    this.selectedShowcase = value;
  }

  async confirm() {
    if (!this.data?.file) return;
    // If creating a new showcase, create it first
    let targetShowcase = this.selectedShowcase;
    if (this.selectedShowcase === '__create__' && this.newShowcaseName) {
      const newId = await this.service.createShowcase(this.newShowcaseName);
      if (newId) targetShowcase = newId;
    }
    await this.service.addImageFromFile(this.data.file, targetShowcase, this.data.title, this.data.description);
    // persist last used showcase
    if (targetShowcase) localStorage.setItem('mebloggy.lastShowcase', targetShowcase);
    this.snackBar.open('Image uploaded', 'OK', { duration: 2000 });
    // clear creatingNew
    this.creatingNew = false;
    this.newShowcaseName = '';
    this.dialogRef.close(true);
  }

  cancel() { this.dialogRef.close(false); }
}
