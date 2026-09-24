/**
 * Play Store in-app update check, via @capawesome/capacitor-app-update (wraps Google's official
 * In-App Update API). Android-only, native-app-only: the plugin's web shim resolves everything to
 * "not available", so this is always safe to call on the dev server, the offline PWA build, or iOS.
 *
 * Two paths:
 *  - FLEXIBLE (default): downloads quietly in the background; a toast offers "Restart" once ready.
 *    Used for ordinary releases so it never interrupts a run.
 *  - IMMEDIATE: a full-screen blocking prompt before the user can do anything else. Reserved for a
 *    versionCode we explicitly mark critical (see CRITICAL_VERSION_CODES below) — e.g. a save-
 *    corrupting bug — because it is disruptive and should not be the default experience.
 */
import { AppUpdate, AppUpdateAvailability, FlexibleUpdateInstallStatus } from '@capawesome/capacitor-app-update';

// Bump this when shipping a fix severe enough to justify interrupting play immediately.
// (Nothing so far — the teargas soft-lock fix went out as an ordinary flexible update.)
const CRITICAL_VERSION_CODES = new Set([]);

export class UpdateCheck {
  constructor(ui) {
    this.ui = ui;
    this.installReady = false;
  }

  /** Call once, shortly after boot. Never throws — a failed check just means no update this run. */
  async checkOnLaunch() {
    try {
      const info = await AppUpdate.getAppUpdateInfo();
      if (info.updateAvailability !== AppUpdateAvailability.UPDATE_AVAILABLE) return;

      const critical = info.availableVersionCode && CRITICAL_VERSION_CODES.has(+info.availableVersionCode);
      if (critical && info.immediateUpdateAllowed) {
        await AppUpdate.performImmediateUpdate();   // blocks until the user updates or cancels
        return;
      }
      if (info.flexibleUpdateAllowed) await this._startFlexible();
    } catch (e) { /* dev server, web build, iOS, or Play Store unreachable — nothing to do */ }
  }

  async _startFlexible() {
    try {
      AppUpdate.addListener('onFlexibleUpdateStateChange', (state) => {
        // DOWNLOADED = fully fetched, ready to install on restart. INSTALLED means it already
        // finished (nothing to prompt). Mixing these up would fire the "restart" toast too early.
        if (state.installStatus === FlexibleUpdateInstallStatus.DOWNLOADED) {
          this.installReady = true;
          this.ui.toastUpdateReady?.();
        }
      });
      await AppUpdate.startFlexibleUpdate();
    } catch (e) { /* user declined, or the store call failed — fine, no update this session */ }
  }

  /** "Check for updates" row in Settings. Returns a short status string for the UI to show. */
  async checkManually() {
    try {
      const info = await AppUpdate.getAppUpdateInfo();
      if (info.updateAvailability !== AppUpdateAvailability.UPDATE_AVAILABLE) return { status: 'up-to-date' };
      if (info.flexibleUpdateAllowed) { await this._startFlexible(); return { status: 'downloading' }; }
      if (info.immediateUpdateAllowed) { await AppUpdate.performImmediateUpdate(); return { status: 'updating' }; }
      return { status: 'available-but-blocked' };
    } catch (e) {
      return { status: 'unavailable' };   // not on Android, or not a Play Store install
    }
  }

  /** Finish an already-downloaded flexible update: restarts the app. */
  completeInstall() { return AppUpdate.completeFlexibleUpdate().catch(() => {}); }
}
