import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { HttpClientModule } from '@angular/common/http';
import { RouterModule } from '@angular/router';

import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatInputModule } from '@angular/material/input';
import { FormsModule } from '@angular/forms';
import { DragDropModule } from '@angular/cdk/drag-drop';

import { AppComponent } from './app.component';
import { HeaderComponent } from './components/header/header.component';
import { HomeComponent } from './components/home/home.component';
import { ShowcasePageComponent } from './components/showcase-page/showcase-page.component';
import { ImageModalComponent } from './components/image-modal/image-modal.component';
import { UploadDialogComponent } from './components/upload-dialog/upload-dialog.component';
import { AvatarDialogComponent } from './components/avatar-dialog/avatar-dialog.component';
import { AccountDialogComponent } from './components/account-dialog/account-dialog.component';
import { ImageService } from './services/image.service';
import { AppRoutingModule } from './app-routing.module';

@NgModule({
  declarations: [
    AppComponent,
    HeaderComponent,
    HomeComponent,
    ShowcasePageComponent,
    ImageModalComponent,
    UploadDialogComponent,
    AvatarDialogComponent,
    AccountDialogComponent
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    HttpClientModule,
    AppRoutingModule,
    MatToolbarModule,
    MatIconModule,
    MatButtonModule,
    MatCardModule,
    MatDialogModule
    , MatFormFieldModule
    , MatSelectModule
    , MatSnackBarModule
    , MatInputModule
    , FormsModule
    , DragDropModule
  ],
  providers: [ImageService],
  bootstrap: [AppComponent]
})
export class AppModule { }
