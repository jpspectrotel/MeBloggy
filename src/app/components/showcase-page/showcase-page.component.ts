import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ImageService } from '../../services/image.service';
import { MatDialog } from '@angular/material/dialog';
import { ImageModalComponent } from '../image-modal/image-modal.component';

@Component({
  selector: 'app-showcase-page',
  templateUrl: './showcase-page.component.html',
  styleUrls: ['./showcase-page.component.css']
})
export class ShowcasePageComponent implements OnInit {
  showcase: any = null;
  featuredImage: any = null;
  editTitleMode: boolean = false;
  editedTitle: string = '';

  constructor(private route: ActivatedRoute, public imageService: ImageService, private dialog: MatDialog) { }

  ngOnInit(): void {
    this.route.paramMap.subscribe(async params => {
      const id = params.get('id');
      if (!id) return;
      // waits for the data to be available
      const data = await new Promise<void>(resolve => {
        const sub = this.imageService.showcases$.subscribe(() => { resolve(); sub.unsubscribe(); });
      });
      const show = await this.imageService.getShowcase(id);
      this.showcase = show;
      if (show && show.images && show.images.length) {
        this.setFeatured(show.images[0]);
      }
    });

    this.imageService.featured$.subscribe(i => this.featuredImage = i);
  }

  setFeatured(img: any) {
    this.imageService.setFeaturedImage(img);
    // smooth scroll
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  enableEditTitle() {
    this.editTitleMode = true;
    this.editedTitle = this.showcase?.title || '';
  }

  saveTitle() {
    if (this.editedTitle.trim()) {
      this.showcase.title = this.editedTitle.trim();
    }
    this.editTitleMode = false;
  }

  openDialog() {
    const ref = this.dialog.open(ImageModalComponent, { data: { image: this.featuredImage }, width: '80%' });
    ref.afterClosed().subscribe(result => {
      if (result?.updated || result?.deleted) {
        // service triggers updates via BehaviorSubject
      }
    });
  }
}
