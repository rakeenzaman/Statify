import { Component, OnDestroy, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { forkJoin, from, Observable, Subscription } from 'rxjs';
import { CommonModule } from '@angular/common';
import { NgIf } from '@angular/common';
import { trigger, state, style, animate, transition } from '@angular/animations';

interface AccessTokenResponse {
  access_token: string;
  expires_in: string;
  state: string;
  token_type: string;
}

interface TrackDetails {
  name: string;
  artists: string;
  image: string;
}

interface ArtistDetails {
  name: string;
  image: string;
}

type TimeRange = 'long_term' | 'medium_term' | 'short_term';
type Limit = '5' | '10' | '20' | '50';
type ArtistsOrTracks = 'artists' | 'tracks';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, CommonModule, NgIf],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
  animations: [
    trigger('fadeIn', [
      state('void', style({
        opacity: 0
      })),
      transition(':enter', [
        animate('0.2s ease-in', style({
          opacity: 1
        }))
      ])
    ])
  ]
})

export class AppComponent implements OnInit, OnDestroy {
  private clientId = '9e3ab08fc4b5445f8291b53528be8e26';
  title = 'Statify';
  loggedIn = false;
  isLoading = false;
  accessTokenResponse: AccessTokenResponse = {
    access_token: '',
    expires_in: '',
    state: '',
    token_type: ''
  };
  subscriptions = new Subscription();
  topArtists: ArtistDetails[] = [];
  topTracks: TrackDetails[] = [];
  userName = '';
  date_range: TimeRange = 'short_term';

  ngOnInit(): void {
    this.accessTokenResponse = this.parseHashFragment(window.location.href);
    if (this.accessTokenResponse.access_token) {
      this.fetchData();
    }
  }

  fetchData(): void {
    this.isLoading = true;
    this.subscriptions.add(
      forkJoin({
        artists: this.getTopArtistsOrTracks('artists', this.date_range, '10'),
        tracks: this.getTopArtistsOrTracks('tracks', this.date_range, '10'),
        userData: this.getUserData()
      }).subscribe(({ artists, tracks, userData }) => {
        this.parseTracksData(tracks);
        console.log(this.topTracks);

        this.parseArtistsData(artists);
        console.log(this.topArtists);

        this.userName = userData.display_name;
        console.log(this.userName);
        
        this.isLoading = false;
        this.loggedIn = true;
      },
      (error) => {
        console.error('Error fetching data:', error);
        this.loggedIn = false;
        this.isLoading = false;
      })
    );
  }

  login(): void {
    const scopes = 'user-top-read';
    const redirectUri = window.location.href.split('#')[0];
    const state = this.generateRandomString(16);
    localStorage.setItem('stateKey', state);

    const auth_query_parameters = new URLSearchParams({
      response_type: "token",
      client_id: this.clientId,
      scope: scopes,
      redirect_uri: redirectUri,
      state: state
    });
    console.log(redirectUri);
    window.location.href = 'https://accounts.spotify.com/authorize/?' + auth_query_parameters.toString();
  }

  generateRandomString(length: number): string {
    var text = '';
    var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (var i = 0; i < length; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
  };

  parseHashFragment(url: string): AccessTokenResponse {
    const hash = url.split('#')[1];
    const params = new URLSearchParams(hash);
    const result: AccessTokenResponse = {
      access_token: params.get('access_token') || '',
      expires_in: params.get('expires_in') || '',
      state: params.get('state') || '',
      token_type: params.get('token_type') || ''
    };
    return result;
  }

  async fetchWebApi(token: string, endpoint: string, method: string, body?: string): Promise<any> {
    const res = await fetch(`https://api.spotify.com/${endpoint}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      method,
      body:JSON.stringify(body)
    });
    return await res.json();
  }

  getTopArtistsOrTracks(requestType: ArtistsOrTracks, time_range: TimeRange, limit: Limit): Observable<any> {
    const url = `v1/me/top/${requestType}?time_range=${time_range}&limit=${limit}`;
    return from(this.fetchWebApi(
      this.accessTokenResponse.access_token, url, 'GET'
    ));
  }

  getUserData(): Observable<any> {
    const url = `v1/me`;
    return from(this.fetchWebApi(
      this.accessTokenResponse.access_token, url, 'GET'
    ));
  }

  parseTracksData(data: any): void {
    this.topTracks = data.items.map((item: any) => {
      return {
        name: item.name,
        artists: item.artists.map((artist: any) => artist.name).join(', '),
        image: item.album.images[1].url
      } as TrackDetails;
    });
  }

  parseArtistsData(data: any): void {
    this.topArtists = data.items.map((item: any) => {
      return {
        name: item.name,
        image: item.images[1].url
      } as ArtistDetails;
    });
  }

  changeDateRange(date_range: TimeRange): void {
    console.log(date_range);
    this.date_range = date_range;
    this.fetchData();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }
}

