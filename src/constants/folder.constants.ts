export const FOLDER_NAMES = {
  // Base folder for all uploads
  BASE: "nittoVojon",

  // Subfolders
  MEAL_ITEM: 'meal-items',
  USER: 'users',
  CATEGORY: 'categories',
  PRODUCT: 'products',
  REVIEW: 'reviews',
  CAROUSEL: 'carousels',
  FLASHSALE: 'flash-sales',
  BLOG: 'blogs',

  // Utility function to get full path
  getPath: (folder?: string): string => {
    return folder ? `${FOLDER_NAMES.BASE}/${folder}` : FOLDER_NAMES.BASE;
  },
} as const;
