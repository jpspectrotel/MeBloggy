import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { Component, OnInit, AfterViewInit } from '@angular/core';
import { ImageService } from '../../services/image.service';
import { MatDialog } from '@angular/material/dialog';
import { ImageModalComponent } from '../image-modal/image-modal.component';
import { Router } from '@angular/router';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit, AfterViewInit {
  featuredImage: any = null;
  showcases: any[] = [];
  private allShowcases: any[] = [];

  constructor(public imageService: ImageService, private dialog: MatDialog, private router: Router) { }

  ngOnInit(): void {
    // Subscribe to showcases updates
    this.imageService.showcases$.subscribe(v => {
      this.allShowcases = v || [];
      this.filterShowcases();
    });

    // Subscribe to selected showcase IDs
    this.imageService.selectedShowcaseIds$.subscribe(ids => {
      this.filterShowcases();
    });

    this.imageService.featured$.subscribe(img => this.featuredImage = img);
  }

  filterShowcases() {
    const selectedIds = this.imageService.selectedShowcaseIds$.value;
    if (!selectedIds.length) {
      this.showcases = this.allShowcases;
    } else {
      this.showcases = this.allShowcases.filter(s => selectedIds.includes(s.id));
    }
    // Optionally, update featured image if needed
    if (this.showcases.length) {
      const firstShowcase = this.showcases[0];
      if (firstShowcase.images && firstShowcase.images.length) {
        this.setFeatured(firstShowcase.images[0]);
      }
    }
  }

  ngAfterViewInit(): void {
    // nothing for now.
  }

  setFeatured(img: any) {
    this.imageService.setFeaturedImage(img);
  }

  openEditDialog() {
    const ref = this.dialog.open(ImageModalComponent, { data: { image: this.featuredImage }, width: '80%' });
    ref.afterClosed().subscribe(result => {
      if (result?.updated || result?.deleted) {
        // triggers data refresh via service BehaviorSubject updates
      }
    });
  }

  onSectionTitleClick(showcase: any) {
    this.router.navigate(['/showcase', showcase.id]);
  }

  onThumbClick(img: any, showcaseElement?: HTMLElement) {
    this.setFeatured(img);

    // If page is scrolled down enough, go to top with animation
    if (window.scrollY > 80) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }
    onShowcaseDrop(event: CdkDragDrop<any[]>) {
    moveItemInArray(this.showcases, event.previousIndex, event.currentIndex);
    // Persist new order in service
    this.imageService.showcases$.next([...this.showcases]);
  }
}
