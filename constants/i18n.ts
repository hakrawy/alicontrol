export type AppLanguage = 'English' | 'Arabic';

type TranslationKey =
  | 'tabs.home'
  | 'tabs.search'
  | 'tabs.movies'
  | 'tabs.series'
  | 'tabs.live'
  | 'tabs.watchlist'
  | 'tabs.profile'
  | 'profile.account'
  | 'profile.preferences'
  | 'profile.support'
  | 'profile.editProfile'
  | 'profile.notifications'
  | 'profile.downloads'
  | 'profile.language'
  | 'profile.subtitlePreferences'
  | 'profile.videoQuality'
  | 'profile.helpCenter'
  | 'profile.privacyPolicy'
  | 'profile.terms'
  | 'profile.favorites'
  | 'profile.watched'
  | 'profile.signOut'
  | 'profile.adminDashboard'
  | 'settings.editProfile'
  | 'settings.notifications'
  | 'settings.downloads'
  | 'settings.language'
  | 'settings.subtitlePreferences'
  | 'settings.videoQuality'
  | 'settings.helpCenter'
  | 'settings.privacyPolicy'
  | 'settings.terms'
  | 'settings.publicIdentity'
  | 'settings.displayName'
  | 'settings.username'
  | 'settings.avatarUrl'
  | 'settings.saveChanges'
  | 'settings.saving'
  | 'settings.pushNotifications'
  | 'settings.pushNotificationsDesc'
  | 'settings.emailUpdates'
  | 'settings.emailUpdatesDesc'
  | 'settings.recommendations'
  | 'settings.recommendationsDesc'
  | 'settings.savedTitles'
  | 'settings.recentlyWatched'
  | 'settings.wifiOnly'
  | 'settings.smartDownloads'
  | 'settings.autoplayNextEpisode'
  | 'settings.clearTempStorage'
  | 'settings.appLanguage'
  | 'settings.subtitleLanguage'
  | 'settings.subtitleSize'
  | 'settings.preferredQuality'
  | 'settings.autoplayTrailers'
  | 'settings.autoplayTrailersDesc'
  | 'settings.streamingHelp'
  | 'settings.privacyOverview'
  | 'settings.serviceTerms'
  | 'settings.helpP1'
  | 'settings.helpP2'
  | 'settings.helpP3'
  | 'settings.privacyP1'
  | 'settings.privacyP2'
  | 'settings.privacyP3'
  | 'settings.termsP1'
  | 'settings.termsP2'
  | 'settings.termsP3'
  | 'settings.resetComplete'
  | 'settings.resetDesc'
  | 'settings.storageCleared'
  | 'settings.storageClearedDesc'
  | 'settings.saved'
  | 'settings.savedDesc'
  | 'settings.saveFailed'
  | 'settings.saveFailedDesc'
  | 'settings.missingUsername'
  | 'settings.missingUsernameDesc'
  | 'options.english'
  | 'options.arabic'
  | 'options.none'
  | 'options.small'
  | 'options.medium'
  | 'options.large'
  | 'options.auto';

const en: Record<TranslationKey, string> = {
  'tabs.home': 'Home',
  'tabs.search': 'Search',
  'tabs.movies': 'Movies',
  'tabs.series': 'Series',
  'tabs.live': 'Live TV',
  'tabs.watchlist': 'My List',
  'tabs.profile': 'Profile',
  'profile.account': 'ACCOUNT',
  'profile.preferences': 'PREFERENCES',
  'profile.support': 'SUPPORT',
  'profile.editProfile': 'Edit Profile',
  'profile.notifications': 'Notifications',
  'profile.downloads': 'Downloads',
  'profile.language': 'Language',
  'profile.subtitlePreferences': 'Subtitle Preferences',
  'profile.videoQuality': 'Video Quality',
  'profile.helpCenter': 'Help Center',
  'profile.privacyPolicy': 'Privacy Policy',
  'profile.terms': 'Terms of Service',
  'profile.favorites': 'Favorites',
  'profile.watched': 'Watched',
  'profile.signOut': 'Sign Out',
  'profile.adminDashboard': 'Admin Dashboard',
  'settings.editProfile': 'Edit Profile',
  'settings.notifications': 'Notifications',
  'settings.downloads': 'Downloads',
  'settings.language': 'Language',
  'settings.subtitlePreferences': 'Subtitle Preferences',
  'settings.videoQuality': 'Video Quality',
  'settings.helpCenter': 'Help Center',
  'settings.privacyPolicy': 'Privacy Policy',
  'settings.terms': 'Terms of Service',
  'settings.publicIdentity': 'Public Identity',
  'settings.displayName': 'Display name',
  'settings.username': 'Username',
  'settings.avatarUrl': 'Avatar image URL',
  'settings.saveChanges': 'Save Changes',
  'settings.saving': 'Saving...',
  'settings.pushNotifications': 'Push notifications',
  'settings.pushNotificationsDesc': 'Alerts for live rooms, releases, and account activity',
  'settings.emailUpdates': 'Email updates',
  'settings.emailUpdatesDesc': 'Important account messages and release summaries',
  'settings.recommendations': 'Recommendations',
  'settings.recommendationsDesc': 'Suggestions based on what you watch',
  'settings.savedTitles': 'Saved titles in My List',
  'settings.recentlyWatched': 'Recently watched items',
  'settings.wifiOnly': 'Wi-Fi only downloads',
  'settings.smartDownloads': 'Smart downloads',
  'settings.autoplayNextEpisode': 'Autoplay next episode',
  'settings.clearTempStorage': 'Clear Temporary Storage',
  'settings.appLanguage': 'App Language',
  'settings.subtitleLanguage': 'Subtitle Language',
  'settings.subtitleSize': 'Subtitle Size',
  'settings.preferredQuality': 'Preferred Quality',
  'settings.autoplayTrailers': 'Autoplay trailers',
  'settings.autoplayTrailersDesc': 'Preview titles automatically on supported screens',
  'settings.streamingHelp': 'Streaming Help',
  'settings.privacyOverview': 'Privacy Overview',
  'settings.serviceTerms': 'Service Terms',
  'settings.helpP1': 'Use direct links such as mp4, m3u8, or webm for the most reliable playback inside the app player.',
  'settings.helpP2': 'If a provider blocks embedding, switch to another server or use the external-open button from the player.',
  'settings.helpP3': 'Watch Rooms work best when all participants use the same server source during the session.',
  'settings.privacyP1': 'The app stores account details, favorites, watch history, and your playback preferences to personalize the experience.',
  'settings.privacyP2': 'Live viewer counts are measured from active playback sessions and are used only to show current audience numbers.',
  'settings.privacyP3': 'Administrative actions are restricted by your role and the Supabase policies configured for the project.',
  'settings.termsP1': 'Only stream media you have rights to distribute or access.',
  'settings.termsP2': 'External providers may enforce their own embedding, DRM, or playback restrictions.',
  'settings.termsP3': 'Abusive activity in watch rooms or admin panels may result in restricted access.',
  'settings.resetComplete': 'Reset complete',
  'settings.resetDesc': 'Preferences were restored to defaults.',
  'settings.storageCleared': 'Storage cleared',
  'settings.storageClearedDesc': 'Temporary download cache and playback residue were cleared.',
  'settings.saved': 'Saved',
  'settings.savedDesc': 'Your profile details were updated successfully.',
  'settings.saveFailed': 'Save failed',
  'settings.saveFailedDesc': 'Unable to update your profile right now.',
  'settings.missingUsername': 'Missing username',
  'settings.missingUsernameDesc': 'Please add a username before saving.',
  'options.english': 'English',
  'options.arabic': 'Arabic',
  'options.none': 'None',
  'options.small': 'Small',
  'options.medium': 'Medium',
  'options.large': 'Large',
  'options.auto': 'Auto',
};

const ar: Record<TranslationKey, string> = {
  'tabs.home': 'الرئيسية',
  'tabs.search': 'البحث',
  'tabs.movies': 'الأفلام',
  'tabs.series': 'المسلسلات',
  'tabs.live': 'البث المباشر',
  'tabs.watchlist': 'قائمتي',
  'tabs.profile': 'الملف الشخصي',
  'profile.account': 'الحساب',
  'profile.preferences': 'التفضيلات',
  'profile.support': 'الدعم',
  'profile.editProfile': 'تعديل الملف الشخصي',
  'profile.notifications': 'الإشعارات',
  'profile.downloads': 'التنزيلات',
  'profile.language': 'اللغة',
  'profile.subtitlePreferences': 'تفضيلات الترجمة',
  'profile.videoQuality': 'جودة الفيديو',
  'profile.helpCenter': 'مركز المساعدة',
  'profile.privacyPolicy': 'سياسة الخصوصية',
  'profile.terms': 'شروط الخدمة',
  'profile.favorites': 'المفضلة',
  'profile.watched': 'تمت مشاهدته',
  'profile.signOut': 'تسجيل الخروج',
  'profile.adminDashboard': 'لوحة الإدارة',
  'settings.editProfile': 'تعديل الملف الشخصي',
  'settings.notifications': 'الإشعارات',
  'settings.downloads': 'التنزيلات',
  'settings.language': 'اللغة',
  'settings.subtitlePreferences': 'تفضيلات الترجمة',
  'settings.videoQuality': 'جودة الفيديو',
  'settings.helpCenter': 'مركز المساعدة',
  'settings.privacyPolicy': 'سياسة الخصوصية',
  'settings.terms': 'شروط الخدمة',
  'settings.publicIdentity': 'الهوية العامة',
  'settings.displayName': 'الاسم الظاهر',
  'settings.username': 'اسم المستخدم',
  'settings.avatarUrl': 'رابط الصورة الشخصية',
  'settings.saveChanges': 'حفظ التغييرات',
  'settings.saving': 'جارٍ الحفظ...',
  'settings.pushNotifications': 'إشعارات فورية',
  'settings.pushNotificationsDesc': 'تنبيهات للبث المباشر والإصدارات الجديدة ونشاط الحساب',
  'settings.emailUpdates': 'تحديثات البريد',
  'settings.emailUpdatesDesc': 'رسائل مهمة عن الحساب وملخصات المحتوى',
  'settings.recommendations': 'الاقتراحات',
  'settings.recommendationsDesc': 'توصيات مبنية على ما تشاهده',
  'settings.savedTitles': 'العناوين المحفوظة في قائمتي',
  'settings.recentlyWatched': 'العناصر التي شاهدتها مؤخرًا',
  'settings.wifiOnly': 'التنزيل عبر الواي فاي فقط',
  'settings.smartDownloads': 'التنزيل الذكي',
  'settings.autoplayNextEpisode': 'تشغيل الحلقة التالية تلقائيًا',
  'settings.clearTempStorage': 'مسح التخزين المؤقت',
  'settings.appLanguage': 'لغة التطبيق',
  'settings.subtitleLanguage': 'لغة الترجمة',
  'settings.subtitleSize': 'حجم الترجمة',
  'settings.preferredQuality': 'الجودة المفضلة',
  'settings.autoplayTrailers': 'تشغيل المعاينات تلقائيًا',
  'settings.autoplayTrailersDesc': 'تشغيل معاينات العناوين تلقائيًا في الشاشات المدعومة',
  'settings.streamingHelp': 'مساعدة البث',
  'settings.privacyOverview': 'نظرة على الخصوصية',
  'settings.serviceTerms': 'شروط الخدمة',
  'settings.helpP1': 'استخدم روابط مباشرة مثل mp4 أو m3u8 أو webm للحصول على أفضل تشغيل داخل المشغل.',
  'settings.helpP2': 'إذا كان المزود يمنع التضمين، بدّل إلى سيرفر آخر أو استخدم الفتح الخارجي من المشغل.',
  'settings.helpP3': 'غرف المشاهدة تعمل أفضل عندما يستخدم جميع المشاركين نفس مصدر البث أثناء الجلسة.',
  'settings.privacyP1': 'يحفظ التطبيق تفاصيل الحساب والمفضلة وسجل المشاهدة والتفضيلات لتخصيص التجربة.',
  'settings.privacyP2': 'يتم قياس عدد المشاهدين المباشرين من جلسات التشغيل النشطة فقط لإظهار الأرقام الحالية.',
  'settings.privacyP3': 'إجراءات الإدارة محكومة بدورك وسياسات Supabase المهيأة للمشروع.',
  'settings.termsP1': 'لا تقم ببث أي وسائط لا تملك حق توزيعها أو الوصول إليها.',
  'settings.termsP2': 'قد يفرض مزودو الخدمة الخارجيون قيودًا خاصة بالتضمين أو DRM أو التشغيل.',
  'settings.termsP3': 'قد يؤدي السلوك المسيء داخل غرف المشاهدة أو لوحات الإدارة إلى تقييد الوصول.',
  'settings.resetComplete': 'تمت الإعادة',
  'settings.resetDesc': 'تمت إعادة التفضيلات إلى الوضع الافتراضي.',
  'settings.storageCleared': 'تم مسح التخزين',
  'settings.storageClearedDesc': 'تم مسح ملفات التخزين المؤقت وآثار التشغيل المؤقتة.',
  'settings.saved': 'تم الحفظ',
  'settings.savedDesc': 'تم تحديث بيانات ملفك الشخصي بنجاح.',
  'settings.saveFailed': 'فشل الحفظ',
  'settings.saveFailedDesc': 'تعذر تحديث ملفك الشخصي حاليًا.',
  'settings.missingUsername': 'اسم المستخدم مطلوب',
  'settings.missingUsernameDesc': 'أضف اسم مستخدم قبل الحفظ.',
};

export function translate(language: string, key: TranslationKey) {
  const dictionary = language === 'Arabic' ? ar : en;
  return dictionary[key] ?? en[key] ?? key;
}

const arabicOptionLabels = {
  'options.english': 'الإنجليزية',
  'options.arabic': 'العربية',
  'options.none': 'بدون',
  'options.small': 'صغير',
  'options.medium': 'متوسط',
  'options.large': 'كبير',
  'options.auto': 'تلقائي',
} satisfies Partial<Record<TranslationKey, string>>;

export function localizePreferenceValue(language: string, value: string) {
  const normalized = value.trim().toLowerCase();
  const keyMap: Record<string, TranslationKey> = {
    english: 'options.english',
    arabic: 'options.arabic',
    none: 'options.none',
    small: 'options.small',
    medium: 'options.medium',
    large: 'options.large',
    auto: 'options.auto',
  };

  const mappedKey = keyMap[normalized];
  if (!mappedKey) return value;
  if (language === 'Arabic' && mappedKey in arabicOptionLabels) {
    return arabicOptionLabels[mappedKey] ?? value;
  }
  return translate(language, mappedKey);
}
