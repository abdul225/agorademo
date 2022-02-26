import { environment } from './../environments/environment';
import { Component } from '@angular/core';
import { AgoraClient, ClientEvent, NgxAgoraService, Stream, StreamEvent } from 'ngx-agora';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  title = 'agora-video';
  localCallId = 'agora_local';
  remoteCallId = 'agora_remote';
  remoteCalls: string[] = [];
  globalStream!: Stream;
  private client!: AgoraClient;
  private localStream!: Stream;
  private uid: number = Math.floor(Math.random() * 100);
  privilegeExpiredTs = 8400;
  tokenA!: string | null;
  role:string = "subscriber";
  constructor(private ngxAgoraService: NgxAgoraService, private http: HttpClient) {

  }

  ngOnInit() {
    let searchParams = new HttpParams();
    searchParams = searchParams.append('channelName', 'demo');
    searchParams = searchParams.append('role', 'subscriber');
    searchParams = searchParams.append('uid', this.uid.toString());
    searchParams = searchParams.append('expiryTime', this.privilegeExpiredTs);

    this.http.get<any>('https://abdul225.github.io/agorademo/access-token', {
      params: searchParams
    }).subscribe((response) => {

      this.tokenA = response.token;
      console.log("the http resp is !!!!", response.token, this.tokenA);
      console.log("Token With Integer Number Uid: ", this.tokenA);
      this.client = this.ngxAgoraService.createClient({ mode: 'live', codec: 'vp8' });
      this.assignClientHandlers();
      if(this.role == 'publisher'){
      this.localStream = this.ngxAgoraService.createStream({ streamID: this.uid, audio: true, video: true, screen: false });
      this.assignLocalStreamHandlers();
      // Join and publish methods added in this step
      this.initLocalStream(() => this.join(uid => this.publish(), error => console.error(error)));
      }
      else{
        this.remotejoin(() => this.join(uid => console.log("joined successfully"), error => console.error(error)));
      }
    });
    
  }

  // joining a remote channel as a subscriber
  remotejoin(onSuccess?: (uid: number | string) => void, onFailure?: (error: Error) => void): void {
    this.client.join(this.tokenA, 'demo', this.uid, onSuccess, onFailure);
  }


  /**
   * Attempts to connect to an online chat room where users can host and receive A/V streams.
   */
  join(onSuccess?: (uid: number | string) => void, onFailure?: (error: Error) => void): void {
    console.log("the token id in the join method is", this.tokenA);
    this.client.join(this.tokenA, 'demo', this.uid, onSuccess, onFailure);
  }

  /**
   * Attempts to upload the created local A/V stream to a joined chat room.
   */
  publish(): void {
    this.client.publish(this.localStream, err => console.log('Publish local stream error: ' + err));
  }

  private assignClientHandlers(): void {
    this.client.on(ClientEvent.LocalStreamPublished, evt => {
      console.log('Publish local stream successfully');
    });

    this.client.on(ClientEvent.Error, error => {
      console.log('Got error msg:', error.reason);
      if (error.reason === 'DYNAMIC_KEY_TIMEOUT') {
        this.client.renewChannelKey(
          '',
          () => console.log('Renewed the channel key successfully.'),
          renewError => console.error('Renew channel key failed: ', renewError)
        );
      }
    });

    this.client.on(ClientEvent.RemoteStreamAdded, evt => {
      const stream = evt.stream as Stream;
      this.client.subscribe(stream, { audio: true, video: true }, err => {
        console.log('Subscribe stream failed', err);
      });
    });

    this.client.on(ClientEvent.RemoteStreamSubscribed, evt => {
      const stream = evt.stream as Stream;
      this.globalStream = stream;
      const id = this.getRemoteId(stream);
      if (!this.remoteCalls.length) {
        this.remoteCalls.push(id);
        setTimeout(() => stream.play(id), 1000);
      }
    });

    this.client.on(ClientEvent.RemoteStreamRemoved, evt => {
      const stream = evt.stream as Stream;
      if (stream) {
        stream.stop();
        this.remoteCalls = [];
        console.log(`Remote stream is removed ${stream.getId()}`);
      }
    });

    this.client.on(ClientEvent.PeerLeave, evt => {
      const stream = evt.stream as Stream;
      if (stream) {
        stream.stop();
        this.remoteCalls = this.remoteCalls.filter(call => call !== `${this.getRemoteId(stream)}`);
        console.log(`${evt.uid} left from this channel`);
      }
    });
  }

  private assignLocalStreamHandlers(): void {
    this.localStream.on(StreamEvent.MediaAccessAllowed, () => {
      console.log('accessAllowed');
    });

    // The user has denied access to the camera and mic.
    this.localStream.on(StreamEvent.MediaAccessDenied, () => {
      console.log('accessDenied');
    });
  }

  private initLocalStream(onSuccess?: () => any): void {
    this.localStream.init(
      () => {
        // The user has granted access to the camera and mic.
        this.localStream.play(this.localCallId);
        if (onSuccess) {
          onSuccess();
        }
      },
      err => console.error('getUserMedia failed', err)
    );
  }

  private getRemoteId(stream: Stream): string {
    return `agora_remote-${stream.getId()}`;
  }
  leave() {
    if (this.globalStream) {
      this.globalStream.close();
      this.localStream.close();
      this.remoteCalls = [];
      console.log(`Remote stream is removed ${this.globalStream.getId()}`);
    }
  }


}
