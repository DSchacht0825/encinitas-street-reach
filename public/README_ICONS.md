# PWA Icons

This app requires two icon files for Progressive Web App functionality:

## Required Icons

1. **icon-192x192.png** - 192x192 pixels
2. **icon-512x512.png** - 512x512 pixels

## Creating Icons

You can create these icons using any of these methods:

### Option 1: Use Online Icon Generator
1. Go to https://www.pwabuilder.com/imageGenerator
2. Upload the SDRM logo or create a custom icon
3. Generate icons for Android/Chrome
4. Download and place in the `/public` folder

### Option 2: Use Figma/Photoshop
1. Create a 512x512px canvas
2. Add the SDRM logo or "SR" text on blue background (#1e40af)
3. Export as PNG at 512x512
4. Resize to 192x192 for the smaller icon
5. Save both files in `/public` folder

### Option 3: Simple Placeholder
Until you have custom icons, you can use solid color squares:
- Create 192x192px and 512x512px PNG files
- Fill with the app theme color (#1e40af)
- Add white "SR" text in center
- Save as `icon-192x192.png` and `icon-512x512.png`

## Quick Setup with ImageMagick

If you have ImageMagick installed:

```bash
# Create a simple blue icon with "SR" text
convert -size 512x512 xc:"#1e40af" \
  -gravity center \
  -pointsize 200 \
  -fill white \
  -annotate +0+0 "SR" \
  public/icon-512x512.png

convert public/icon-512x512.png \
  -resize 192x192 \
  public/icon-192x192.png
```

## Important Notes

- Icons should have rounded corners for iOS
- Use maskable icons for Android (safe zone in center)
- Transparent backgrounds work best
- Test on both iOS and Android devices
