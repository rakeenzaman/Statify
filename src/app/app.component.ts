import { Component, OnDestroy, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { forkJoin, from, Observable, Subscription } from 'rxjs';
import { CommonModule } from '@angular/common';
import { NgIf } from '@angular/common';

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
  styleUrl: './app.component.scss'
})

//http://localhost:4200/#access_token=BQB1eiFF3LkU59l1qOtWkYpOmgkUqaChRtQu_mf2EY66IXdsKQWlMe3TOzlUgViUvVMZtOwt5XgWfpUisWMIo6dI7E_KmwXC7bebihQkuBkNlnZYHsKJ-xPrTDZJferqP_skoy_tKqH78hRWfAq7GgcvDek10YGVsfY9EoVNltmjDL_AKqoXZ7K6Qad1vn892PgOXQ&token_type=Bearer&expires_in=3600&state=OPDJ4CDLclWnDJCm

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

  ngOnInit(): void {
    this.accessTokenResponse = this.parseHashFragment(window.location.href);
    if (this.accessTokenResponse.access_token) {
      this.loggedIn = true;
      this.isLoading = true;
      this.fetchData();
    }
  }

  fetchData(): void {
    this.subscriptions.add(
      forkJoin({
        artists: this.getTopArtistsOrTracks('artists', 'long_term', '10'),
        tracks: this.getTopArtistsOrTracks('tracks', 'medium_term', '10'),
        userData: this.getUserData()
      }).subscribe(({ artists, tracks, userData }) => {
        this.parseTracksData(tracks);
        console.log(this.topTracks);

        this.parseArtistsData(artists);
        console.log(this.topArtists);

        this.userName = userData.display_name;
        console.log(this.userName);
        
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

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }
}

