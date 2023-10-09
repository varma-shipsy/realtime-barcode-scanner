import { Component, OnInit } from '@angular/core';
import { Barcode, BarcodeScanner, LensFacing } from '@capacitor-mlkit/barcode-scanning';
import { AlertController } from '@ionic/angular';
import { FilePicker } from '@capawesome/capacitor-file-picker';
import Quagga from '@ericblade/quagga2';
import { getMainBarcodeScanningCamera } from '.././camera-access';
import { BeepService } from '.././beep.service';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
})
export class HomePage implements OnInit {
  isSupported = false;
  barcodes: Barcode[] = [];

  started: boolean | undefined;
  errorMessage: string | undefined;
  acceptAnyCode = true;

  private lastScannedCode: string | undefined;
  private lastScannedCodeDate: number  | undefined;
  multibarcodes: string[] = [];

  constructor(private alertController: AlertController, private beepService: BeepService) {}

  ngOnInit() {
    BarcodeScanner.isSupported().then((result) => {
      this.isSupported = result.supported;
    });
  }

  async scan(): Promise<void> {
    const granted = await this.requestPermissions();
    if (!granted) {
      this.presentAlert();
      return;
    }
    const { barcodes } = await BarcodeScanner.scan();
    this.barcodes.push(...barcodes);
  }

  async requestPermissions(): Promise<boolean> {
    const { camera } = await BarcodeScanner.requestPermissions();
    return camera === 'granted' || camera === 'limited';
  }

  async presentAlert(): Promise<void> {
    const alert = await this.alertController.create({
      header: 'Permission denied',
      message: 'Please grant camera permission to use the barcode scanner.',
      buttons: ['OK'],
    });
    await alert.present();
  }

  public async installGoogleBarcodeScannerModule(): Promise<void> {
    await BarcodeScanner.installGoogleBarcodeScannerModule();
  }

  public async readBarcodeFromImage(): Promise<void> {
    const { files } = await FilePicker.pickImages({ multiple: false });
    const path = files[0]?.path;
    if (!path) {
      return;
    }
    const { barcodes } = await BarcodeScanner.readBarcodesFromImage({
      path
    });
    this.barcodes.push(...barcodes);
  }

  // multiple barcode read
  public initializeScanner(): Promise<void> {
    if (!navigator.mediaDevices || !(typeof navigator.mediaDevices.getUserMedia === 'function')) {
      this.errorMessage = 'getUserMedia is not supported. Please use Chrome on Android or Safari on iOS';
      this.started = false;
      return Promise.reject(this.errorMessage);
    }

    // enumerate devices and do some heuristics to find a suitable first camera
    return Quagga.CameraAccess.enumerateVideoDevices()
      .then(mediaDeviceInfos => {
        const mainCamera = getMainBarcodeScanningCamera(mediaDeviceInfos);
        if (mainCamera) {
          console.log(`Using ${mainCamera.label} (${mainCamera.deviceId}) as initial camera`);
          return this.initializeScannerWithDevice(mainCamera.deviceId);
        } else {
          console.error(`Unable to determine suitable camera, will fall back to default handling`);
          return this.initializeScannerWithDevice(undefined);
        }
      })
      .catch(error => {
        this.errorMessage = `Failed to enumerate devices: ${error}`;
        this.started = false;
      });
  }

  private initializeScannerWithDevice(preferredDeviceId: string | undefined): Promise<void> {
    console.log(`Initializing Quagga scanner...`);

    const constraints: MediaTrackConstraints = {};
    if (preferredDeviceId) {
      // if we have a specific device, we select that
      constraints.deviceId = preferredDeviceId;
    } else {
      // otherwise we tell the browser we want a camera facing backwards (note that browser does not always care about this)
      constraints.facingMode = 'environment';
    }

    return Quagga.init({
        inputStream: {
          type: 'LiveStream',
          constraints,
          area: { // defines rectangle of the detection/localization area
            top: '25%',    // top offset
            right: '10%',  // right offset
            left: '10%',   // left offset
            bottom: '25%'  // bottom offset
          },
          target: document.querySelector('#scanner-container') ?? undefined
        },
        decoder: {
          readers: ['ean_reader'],
          multiple: false
        },
        // See: https://github.com/ericblade/quagga2/blob/master/README.md#locate
        locate: false
      },
      (err) => {
        if (err) {
          console.error(`Quagga initialization failed: ${err}`);
          this.errorMessage = `Initialization error: ${err}`;
          this.started = false;
        } else {
          console.log(`Quagga initialization succeeded`);
          Quagga.start();
          this.started = true;
          Quagga.onDetected((res) => {
            if (res.codeResult.code) {
              this.onBarcodeScanned(res.codeResult.code);
            }
          });
        }
      });
  }

onBarcodeScanned(code: string) {

  // ignore duplicates for an interval of 1.5 seconds
  const now = new Date().getTime();
  if (code === this.lastScannedCode
    && ((this.lastScannedCodeDate !== undefined) && (now < this.lastScannedCodeDate + 1500))) {
    return;
  }

  this.lastScannedCode = code;
  this.lastScannedCodeDate = now;
  this.beepService.beep();
  this.multibarcodes.push(code);
  console.log(this.multibarcodes)
  console.log(code)
}

}
