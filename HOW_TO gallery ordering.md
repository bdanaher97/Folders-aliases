#### GALLERY & IMAGE ORDERING – HOW-TO

This site supports **custom ordering** of both galleries and images inside galleries.
Ordering is handled using simple text files that you can edit.

---

#### HOW GALLERY ORDERING WORKS

1. **Location of galleries**

   - Each gallery is a folder inside your main gallery directory.
   - Example:
     galleries/
     0003_landscapes
     0001_portraits
     0002_macro

2. **Number prefix method**

   - If a gallery folder name starts with a number and underscore (e.g., `0003_`), that number is used for ordering.
   - Higher numbers appear first in the list.
   - The number prefix is **not shown** on the site — it’s stripped from the display name.
   - Example:

     - Folder: `0010_wildlife` → Displayed as “wildlife”.

3. **.order file method**

   - If a `.order` file exists in the main gallery directory, it overrides the automatic prefix sort.
   - The `.order` file is just a list of folder names in the exact order you want them displayed.
   - You can mix prefixed and non-prefixed names here.
   - Example `.order`:

     ```
     0003_landscapes
     0001_portraits
     0002_macro
     special_gallery
     ```

4. **When both exist**

   - `.order` takes priority over number prefixes.
   - If a folder is missing from `.order`, it will appear after the listed folders, ordered by number prefix (if any) or alphabetically.

---

#### HOW IMAGE ORDERING WORKS

1. **Inside a gallery folder**

   - Images are normally displayed alphabetically by filename.
   - You can override this using a `.order` file inside the gallery folder.

2. **Using a .order file**

   - List the image filenames in the exact sequence you want them displayed.
   - Images not listed will appear after the ordered ones, in alphabetical order.
   - Example `.order`:

     ```
     sunset.jpg
     forest.jpg
     beach.jpg
     ```

3. **Duplicate entries**

   - If you list an image twice in `.order`, it will appear twice in the gallery.

---

#### AUTOMATIC FILES

1. **.images**

   - Automatically generated list of images in a folder.
   - You don’t need to edit this — it’s for convenience when editing `.order` files.

2. **.folders**

   - Automatically generated list of gallery folders in the main gallery directory.
   - Again, this is for your reference only.

---

#### UPDATING ORDER AFTER CHANGES

If you add, remove, or rename galleries or images:

1. Run the manifest generation script:

   npm run gen:manifest

This updates `.images` and `.folders` files.

2. Edit `.order` files if you want custom ordering.

3. Commit and push changes to Git so the site updates.

---

#### QUICK TIPS

- For quick reordering without touching `.order`, just change the numeric prefix — higher numbers float to the top.
- Use `.order` when you want full manual control.
- Remember: `.order` beats prefixes.
- Always run the manifest script after adding new content so the helper files are up to date.

---

#### COVER IMAGE LOGIC

Cover images for galleries are chosen in the following order:

1. **If a `.cover` file exists in a gallery’s parent folder**

- The file should contain the exact filename of the desired image (located anywhere under that parent gallery).
- This image is used as the gallery’s cover.

2. **If no `.cover` file**

- If a subfolder has **exactly one image** at the same level as other subfolders, that image is treated as the cover for the subfolder’s parent gallery.
- This image will be hidden from the gallery’s own image grid so it doesn’t appear twice.

3. **Fallbacks**

- If no `.cover` file and no single-image subdir: use the first image found in the first subdirectory (based on gallery ordering rules).
- If still no image found, no cover is shown.

This ensures that:

- You can explicitly set covers with `.cover`.
- Logical single-image folders can serve as covers automatically.
- Fallbacks keep the UI populated even when no explicit cover is chosen.

---
