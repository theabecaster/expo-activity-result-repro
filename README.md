# activity-result-repro

Minimal reproduction for an Android bug in `expo-modules-core`: an activity result is dropped when the Activity that launched it is destroyed and recreated **in the same process** while the other Activity is open.

The example uses `expo-image-picker`: if the system font size changes while the photo picker is open, `launchImageLibraryAsync()` never settles and `getPendingResultAsync()` returns `null`.

- Expo SDK 54 (`expo` 54.0.38, `expo-modules-core` 3.0.30, `expo-image-picker` 17.0.11), React Native 0.81.5, New Architecture.
- Created from the `blank-typescript` template. The only additions are `expo-image-picker` and the code in `App.tsx`. No config plugins; `android:configChanges` is the template default (`keyboard|keyboardHidden|orientation|screenSize|screenLayout|uiMode`).

## The app

One screen (`App.tsx`):

- **Root component mounts: N**: how many times the root component has mounted in this JS runtime. It goes up by one each time the Activity is recreated.
- **launchImageLibraryAsync** button: calls `ImagePicker.launchImageLibraryAsync()` and shows `still waiting` until the promise settles, then the result.
- **getPendingResultAsync** button: calls `ImagePicker.getPendingResultAsync()` and shows what it returns.

The values are kept at module level, so they survive the remount.

## Steps

Android only, on a device or emulator with at least one photo. The dependencies were installed with bun (`bun.lock` is committed, so `bun install` gives the exact versions); `npm install` works too.

```sh
npm install
npx expo run:android --variant release
```

(`npx expo run:android` without `--variant release` builds the debug variant, which needs the dev server running.)

1. The app shows `Root component mounts: 1`.
2. Tap **launchImageLibraryAsync**. The system photo picker opens and the app shows `launch result: still waiting` behind it.
3. With the picker open, change the system font size:

   ```sh
   adb shell settings put system font_scale 1.3
   ```

   (Settings > Display > Font size does the same.)
4. Pick a photo in the picker and confirm.
5. Back in the app, tap **getPendingResultAsync**.

Restore the font size afterwards:

```sh
adb shell settings put system font_scale 1.0
```

### Control

Do steps 1, 2, 4 and 5 without step 3. The app shows `launch result: resolved: {"assets":[…],"canceled":false}` and the mount counter stays at 1.

## Expected

The picked photo reaches the app: either the `launchImageLibraryAsync()` promise resolves with it, or `getPendingResultAsync()` returns it.

## Actual

- `Root component mounts: 2`: the Activity was recreated in the same process (same pid).
- `launch result: still waiting`: the promise never settles.
- `pending result: returned: null`, on every call.
- Tapping **launchImageLibraryAsync** again does not open the picker. It resolves at once with `{"assets":null,"canceled":true}`.

Seen on a Pixel 9 Pro XL running Android 17, 3 runs out of 3. The control passed 3 out of 3.
