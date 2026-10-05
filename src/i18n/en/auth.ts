// English wording: auth. Keys start with "auth."; the Malay twin lives in ../ms/auth.ts.
export const enAuth = {
  // brand
  'auth.brand.slogan': 'Track your money. Understand your habits. Plan your future.',
  'auth.pillar.kira.label': 'Track',
  'auth.pillar.kira.hint': 'Record your income and spending',
  'auth.pillar.faham.label': 'Analyse',
  'auth.pillar.faham.hint': 'Understand your money patterns',
  'auth.pillar.rancang.label': 'Plan',
  'auth.pillar.rancang.hint': 'Budgets and savings goals',

  // shared fields
  'auth.field.email': 'Email',
  'auth.field.emailPlaceholder': 'name@example.com',
  'auth.field.password': 'Password',
  'auth.field.toggleHint': 'Show/hide password',

  // errors (returned by sign-up / sign-in)
  'auth.error.emailInvalid': 'Invalid email format.',
  'auth.error.nameRequired': 'Please enter a display name.',
  'auth.error.passwordWeak': 'Password must be at least 8 characters, with letters and numbers.',
  'auth.error.consentRequired': 'Please agree to the Privacy Notice to continue.',
  'auth.error.emailTaken': 'This email is already registered.',
  'auth.error.badCredentials': 'Incorrect email or password.',

  // login
  'auth.login.passwordPlaceholder': 'Your password',
  'auth.login.forgotTitle': 'Forgot password',
  'auth.login.forgotMessage': 'Resetting a password needs a cloud account. It is not available in this offline mode.',
  'auth.login.forgotLink': 'Forgot password?',
  'auth.login.wait': 'Please wait...',
  'auth.login.submit': 'Log in',
  'auth.login.noAccount': 'No account yet?',
  'auth.login.register': 'Sign up',
  'auth.login.simulation': 'Simulation mode: accounts are stored on this device only.',

  // register
  'auth.register.title': 'Create account',
  'auth.register.displayName': 'Display name',
  'auth.register.displayNamePlaceholder': 'e.g. Aqil',
  'auth.register.passwordLabel': 'Password (min 8 characters, with letters and numbers)',
  'auth.register.confirmPassword': 'Confirm password',
  'auth.register.mismatch': 'Passwords do not match',
  'auth.register.language': 'Language',
  'auth.register.consentBefore': 'I have read and agree to the ',
  'auth.register.consentLink': 'Privacy Notice',
  'auth.register.consentAfter': ' and allow my data to be processed as described.',
  'auth.register.wait': 'Please wait...',
  'auth.register.submit': 'Sign up',

  // onboarding: goals
  'auth.onboarding.goal.track': 'Track spending',
  'auth.onboarding.goal.budget': 'Manage budgets',
  'auth.onboarding.goal.save': 'Build savings',
  'auth.onboarding.goal.debt': 'Reduce debt',

  // onboarding: tips
  'auth.onboarding.tip.add.title': 'Add a record',
  'auth.onboarding.tip.add.body': 'Tap the + button in the middle of the bottom bar to record spending, income or a transfer between accounts. You can split it into items (e.g. nasi lemak, SST).',
  'auth.onboarding.tip.cards.title': 'Account cards',
  'auth.onboarding.tip.cards.body': 'On Home, swipe the card sideways to switch accounts. The charts and lists below follow the selected account.',
  'auth.onboarding.tip.analyse.title': 'Analyse',
  'auth.onboarding.tip.analyse.body': 'The Analyse tab shows income vs spending each month, where your money goes, your biggest spending day and a few quick summaries.',
  'auth.onboarding.tip.plan.title': 'Plan',
  'auth.onboarding.tip.plan.body': 'More > Plan: savings goals, upcoming bills and reminders in one place. You can also see your budgets from here.',
  'auth.onboarding.tip.recurring.title': 'Recurring',
  'auth.onboarding.tip.recurring.body': 'More > Recurring: salary, rent or subscriptions are recorded automatically on their date. Choose "Confirm each time" if the amount changes (e.g. electricity bill).',
  'auth.onboarding.tip.assets.title': 'Assets and transfers',
  'auth.onboarding.tip.assets.body': 'More > Assets: all your accounts and your net worth. Moving money between accounts is not counted as spending or income.',
  'auth.onboarding.tip.budgets.title': 'Budgets',
  'auth.onboarding.tip.budgets.body': 'More > Budgets: set a monthly limit for each category and see how much is safe to spend per day.',
  'auth.onboarding.tip.reminders.title': 'Reminders',
  'auth.onboarding.tip.reminders.body': 'More > Plan > Reminders: turn on notifications for upcoming bills and warnings when a budget is nearly used up. It is your choice, and you can turn them off any time.',
  'auth.onboarding.tip.privacy.title': 'Privacy',
  'auth.onboarding.tip.privacy.body': 'Tap the eye icon to hide all amounts when you are in public.',
  'auth.onboarding.tip.data.title': 'Your data',
  'auth.onboarding.tip.data.body': 'More > Settings: export CSV, repeat the tutorial, or delete your account and all your data.',

  // onboarding: welcome
  'auth.onboarding.hello': 'Hi, {name}!',
  'auth.onboarding.welcomeBody': '{app} helps you record, understand and plan your money. Setup takes under 2 minutes and every step is optional.',

  // onboarding: setup
  'auth.onboarding.goalTitle': 'What is your goal?',
  'auth.onboarding.balanceTitle': 'Starting balance',
  'auth.onboarding.balanceBody': 'An estimate of today\'s balance. You can change it later in More > Assets. You can leave it blank.',
  'auth.onboarding.bank': 'Bank',
  'auth.onboarding.cash': 'Cash',

  // onboarding: plan
  'auth.onboarding.salaryTitle': 'Your salary',
  'auth.onboarding.salaryBody': 'Optional. Enter your net salary (after EPF and SOCSO) and we will record it automatically every month, starting from your next payday. You can skip this and add it later in More > Recurring.',
  'auth.onboarding.netSalary': 'Net salary',
  'auth.onboarding.payDay': 'Payday (day of the month)',
  'auth.onboarding.payDayInvalid': 'Enter a payday between 1 and 31, or leave the salary blank to skip.',
  'auth.onboarding.salaryVaries': 'Amount varies',
  'auth.onboarding.salaryVariesHint': 'We ask for the actual amount each month instead of recording it automatically.',
  'auth.onboarding.salaryRecurringTitle': 'Salary',
  'auth.onboarding.goalSectionTitle': 'First savings goal',
  'auth.onboarding.goalSectionBody': 'Optional. Examples: Emergency fund, Umrah, Car. You can set a deadline later in More > Plan.',
  'auth.onboarding.goalNamePlaceholder': 'Goal name',
  'auth.onboarding.goalTarget': 'Target',
  'auth.onboarding.hintBudget': 'Monthly budgets for each category can be set in More > Budgets.',
  'auth.onboarding.hintDebt': 'Add your monthly debt payment in More > Recurring so it is always in your bill schedule.',
  'auth.onboarding.hintDefault': 'Start by adding your first record with the + button below.',

  // onboarding: tips and buttons
  'auth.onboarding.tipsTitle': 'How to use',
  'auth.onboarding.start': 'Get started',
  'auth.onboarding.next': 'Next',

  // privacy
  'auth.privacy.title': 'Privacy Notice',
  'auth.privacy.collect.title': 'Data we collect',
  'auth.privacy.collect.body': 'Email, display name, avatar colour, language, financial goal (optional), plus the accounts, categories, budgets and transactions you enter yourself. We do not ask for your IC number, address or full card number (only the last 4 digits if you choose to add them).',
  'auth.privacy.purpose.title': 'Purpose',
  'auth.privacy.purpose.body': 'To run the app\'s features: logging in, keeping your financial records and showing reports. Your data is not sold or used for advertising.',
  'auth.privacy.storage.title': 'Where data is stored',
  'auth.privacy.storage.body': 'In this simulation mode, data is stored on your device only. When a cloud server is used, we will state the server location and data processors here.',
  'auth.privacy.retention.title': 'Retention period',
  'auth.privacy.retention.body': 'For as long as your account is active. When you delete your account, all your data is deleted.',
  'auth.privacy.rights.title': 'Your rights',
  'auth.privacy.rights.body': 'You can access, correct, export (CSV) and delete your data through More > Settings.',
  'auth.privacy.contact.title': 'Contact us',
  'auth.privacy.contact.body': '[Enter your data protection officer / contact email here]',

  // cloud account errors
  'auth.error.network': 'No internet connection. Please try again.',
  'auth.error.generic': 'Something went wrong. Please try again.',
  'auth.error.codeInvalid': 'The code is wrong or has expired.',
  'auth.error.rateLimit': 'Too many attempts. Please wait a moment.',
  'auth.error.samePassword': 'The new password must be different from the old one.',
  'auth.error.signupDisabled': 'Sign-ups are not open yet.',
  'auth.error.syncFailed': 'Could not download your data. Check your internet connection and try again.',

  // forgot password
  'auth.forgot.title': 'Forgot password',
  'auth.forgot.intro': 'Enter your account email. We will send a 6-digit code to reset your password.',
  'auth.forgot.send': 'Send code',
  'auth.forgot.sending': 'Sending...',

  // email code (confirm account / reset password)
  'auth.verify.titleSignup': 'Confirm your email',
  'auth.verify.titleReset': 'Reset password',
  'auth.verify.introSignup': 'We sent a 6-digit code to {email}. Enter it below to activate your account.',
  'auth.verify.introReset': 'We sent a 6-digit code to {email}. Enter it and choose a new password.',
  'auth.verify.code': 'Code',
  'auth.verify.codePlaceholder': '123456',
  'auth.verify.newPassword': 'New password (min 8 characters, with letters and numbers)',
  'auth.verify.submitSignup': 'Confirm',
  'auth.verify.submitReset': 'Change password',
  'auth.verify.resend': 'Send a new code',
  'auth.verify.resent': 'A new code is on its way.',
  'auth.verify.spamHint': 'Cannot find it? Check your spam folder too.',

  // bring an old on-phone account into the cloud account
  'auth.migrate.title': 'Bring your old data',
  'auth.migrate.intro': 'We found an account that was saved only on this phone. Move its records into your new account so they are safely stored online?',
  'auth.migrate.account': 'Old account',
  'auth.migrate.password': 'Password of the old account',
  'auth.migrate.wrongPassword': 'Wrong password for the old account.',
  'auth.migrate.submit': 'Move my data',
  'auth.migrate.wait': 'Moving...',
  'auth.migrate.skip': 'Skip',
  'auth.migrate.skipHint': 'If you skip, the old account stays on this phone but will not be backed up or synced, and we will not ask again.',

  // privacy: storage text when cloud accounts are on
  'auth.privacy.storage.bodyCloud': 'Your records are kept on your phone and copied to a secure online database (Supabase) so they are there when you sign in on another phone. Only you can read them through the app, but the people who run the database can technically access it. [Enter the server region and data processor details here before launch]',
} as const;
