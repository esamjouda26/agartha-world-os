/**
 * Phase F — translate the entire `guest.*` namespace in messages/ms.json
 * to Bahasa Malaysia.
 *
 * Strategy: produce a complete native-Malay tree that mirrors the
 * structural shape of `en.guest`. We do NOT touch `auth`, `portal`,
 * `nav`, etc. — those are already translated.
 *
 * The translation is contemporary, service-tone Malaysian Malay. Where
 * the source uses ICU pluralization (`{count, plural, one {…} other
 * {…}}`), the Malay version collapses to `other` per CLDR pluralrules
 * (Malay has no grammatical pluralization). Loanwords like "slot",
 * "QR", "promo", "Stripe" are kept as-is.
 *
 * Run: node scripts/translate-guest-ms.mjs
 */

import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const MS_PATH = resolve(process.cwd(), "messages/ms.json");

const guest = {
  shell: {
    brand: "AgarthaOS",
    myBooking: "Tempahan saya",
    footerCopyright: "© {year} AgarthaOS",
    footerPrivacy: "Privasi",
    footerTerms: "Terma",
  },
  common: {
    loading: "Memuatkan…",
    back: "Kembali",
    save: "Simpan",
    saving: "Menyimpan…",
    cancel: "Batal",
    continue: "Teruskan",
    tryAgain: "Cuba lagi",
    required: "Wajib",
    optional: "Pilihan",
  },
  errors: {
    validationFailed: "Sila semak semula jawapan anda dan cuba lagi.",
    rateLimited: "Terlalu banyak permintaan. Sila tunggu sebentar dan cuba lagi.",
    internal: "Sesuatu tidak kena di pihak kami. Sila cuba lagi.",
    forbidden: "Kami tidak dapat memproses permintaan ini dari sini.",
    notFound: "Kami tidak dapat menjumpai apa yang anda cari.",
    unauthenticated: "Sesi anda telah tamat. Sila log masuk semula.",
    dependencyFailed: "Perkhidmatan yang diperlukan tidak tersedia. Sila cuba lagi sebentar.",
  },
  book: {
    title: "Tempah lawatan anda",
    metaTitle: "Tempah lawatan anda · AgarthaOS",
    metaDescription:
      "Tempah slot di AgarthaOS — pilih pakej, tarikh, masa, dan sahkan dalam beberapa minit.",
    empty: {
      noExperienceTitle: "Tempahan tidak tersedia buat masa ini.",
      noExperienceBody:
        "Tiada pengalaman aktif yang dikonfigurasikan sekarang. Sila datang lagi tidak lama lagi — kami sedang bersiap.",
      noTiersTitle: "Pakej sedang dikonfigurasikan.",
      noTiersBody:
        "Pengalaman ini wujud, tetapi tiada pakej yang diterbitkan lagi. Sila datang lagi tidak lama lagi.",
    },
    step: {
      plan: "Rancang",
      date: "Tarikh",
      time: "Masa",
      details: "Butiran",
      review: "Semak",
    },
    plan: {
      title: "Pilih pakej dan saiz kumpulan anda",
      subtitle: "Harga dikemas kini apabila anda menukar bilangan tetamu.",
      adults: "Dewasa",
      adultsDescription: "Berumur 13 tahun ke atas",
      children: "Kanak-kanak",
      childrenDescription: "Berumur 12 tahun ke bawah",
      perAdult: "setiap dewasa",
      perChild: "setiap kanak-kanak",
      total: "Jumlah",
      guestCountTitle: "Berapa orang tetamu?",
      tierTitle: "Pilih pakej",
      noTiersAvailableTitle: "Tiada pakej tersedia sekarang.",
      noTiersAvailableBody: "Sila datang lagi tidak lama lagi — kami sedang menyediakan pengalaman.",
    },
    date: {
      title: "Pilih tarikh",
      subtitle: "Kami membuka tempahan sehingga 14 hari lebih awal.",
    },
    time: {
      title: "Pilih masa",
      subtitle: "Masa dipaparkan mengikut waktu tempatan kemudahan.",
      changeDate: "Tukar tarikh",
      loadErrorTitle: "Tidak dapat memuatkan ketersediaan",
      loadErrorRateLimited:
        "Anda memilih tarikh terlalu pantas — sila tunggu sebentar dan cuba lagi.",
      loadErrorGeneric: "Tidak dapat memuatkan slot. Sila cuba lagi.",
      tryAgainCta: "Cuba lagi",
      slotFull: "Penuh",
      noSlots: "Tiada slot tersedia pada tarikh ini.",
    },
    details: {
      title: "Butiran anda",
      subtitle: "Kami akan menghantar pengesahan tempahan ke e-mel ini.",
      nameLabel: "Nama penuh",
      emailLabel: "E-mel",
      phoneLabel: "Telefon",
      promoLabel: "Kod promosi",
      promoApply: "Guna",
      promoValid: "Promosi digunakan — diskaun {amount}",
      promoInvalid: "Kod tersebut tidak sah.",
      promoExpired: "Kod tersebut telah tamat tempoh.",
    },
    review: {
      title: "Semak tempahan anda",
      yourDetailsTitle: "Butiran anda",
      subtitle: "Kami akan menahan slot anda selama 15 minit selepas anda mengesahkan.",
      totalLabel: "Jumlah",
      ctaConfirm: "Sahkan & bayar {total}",
      ctaConfirming: "Mengesahkan…",
      ctaConfirmMobile: "Sahkan · {total}",
      termsAck: "Saya bersetuju dengan Terma dan telah membaca notis Privasi.",
      rowBooker: "Penempah",
      rowEmail: "E-mel",
      rowPhone: "Telefon",
      fieldFallback: "—",
      submitErrorGeneric: "Tidak dapat melengkapkan tempahan. Sila cuba lagi.",
    },
    ariaPlanLabel: "Rancang lawatan anda",
    ariaDateLabel: "Pilih tarikh",
    ariaTimeLabel: "Pilih masa",
    ariaDetailsLabel: "Butiran anda",
    ariaReviewLabel: "Semak tempahan anda",
    kicker: "Tempah lawatan",
    back: "Kembali",
    continue: "Teruskan",
    runningTotal: "Jumlah semasa",
    ariaBack: "Kembali",
  },
  payment: {
    metaTitle: "Lengkapkan pembayaran anda · AgarthaOS",
    metaDescription: "Lengkapkan tempahan AgarthaOS anda dengan menyelesaikan pembayaran.",
    bookingLabel: "Tempahan",
    headlineIdle: "Lengkapkan pembayaran anda",
    headlineProcessing: "Menghubungi get pembayaran…",
    headlineSuccess: "Anda sudah bersedia",
    headlineFailure: "Mari cuba sekali lagi",
    headlineExpired: "Kami menahannya selama yang kami boleh",
    idleBody:
      "Kami telah menahan slot anda selama 15 minit. Teruskan ke rakan pembayaran kami untuk mengesahkan tempahan — anda akan dibawa kembali ke sini sebaik sahaja selesai.",
    ctaContinue: "Teruskan ke pembayaran · {total}",
    ctaConnecting: "Sedang menghubung…",
    ctaRetry: "Cuba lagi",
    ctaViewBooking: "Lihat tempahan & kod QR",
    ctaStartOver: "Mulakan tempahan baharu",
    trustRow: "Pembayaran disulitkan · Kami tidak pernah melihat butiran kad anda.",
    successCopy: "Tempahan {ref} anda telah disahkan.",
    successEmail: " Kami telah menghantar kod QR anda ke {email}.",
    failureCopy:
      "Tiada caj dikenakan. Slot anda masih ditahan — cuba lagi atau gunakan kaedah pembayaran lain.",
    expiredCopy:
      "Kami menahan slot selama 15 minit. Pilih masa baharu — kerusi anda mungkin masih tersedia.",
    holdCountdown: "Slot ditahan · {minutes}:{seconds} berbaki",
    holdUrgent: "Kurang daripada 2 minit lagi",
    polling: "Sedang mengesahkan pembayaran anda…",
    pollingHint: "Biasanya mengambil masa beberapa saat. Sila jangan tutup tab ini.",
    pollingTimeout: "Mengambil masa lebih lama daripada jangkaan",
    pollingTimeoutHint:
      "Pembayaran anda masih sedang diproses. Muat semula sebentar lagi, atau lihat Tempahan saya — kami akan menghantar kod QR anda sebaik sahaja ia disahkan.",
    pendingFallback:
      "Pembayaran tidak tersedia buat sementara waktu. Sila cuba lagi sebentar lagi.",
    pendingTitle: "Sila tunggu sebentar",
    notFoundTitle: "Kami tidak dapat menjumpai tempahan tersebut.",
    notFoundBody:
      "Pautan ini mungkin telah tamat tempoh. Jika anda telah membayar, sila log masuk melalui 'Tempahan saya' untuk melihat kod QR anda.",
  },
  lookup: {
    metaTitle: "Tempahan saya · AgarthaOS",
    metaDescription: "Cari tempahan AgarthaOS anda menggunakan rujukan.",
    title: "Cari tempahan anda",
    subtitle:
      "Masukkan rujukan daripada e-mel pengesahan anda. Kami akan menghantar kod sekali guna supaya anda boleh menguruskan tetamu, melihat kod QR, dan menyemak semula memori anda.",
    refLabel: "Rujukan tempahan",
    refPlaceholder: "AG-XXXXXX-NNNN",
    ctaSubmit: "Hantar saya kod sekali guna",
    ctaSubmitting: "Menghantar kod…",
    helpToggle: "Tidak ada rujukan?",
    helpBody:
      'Rujukan anda terdapat dalam e-mel pengesahan tempahan — cari "AG-". Jika anda tidak menemuinya, hantarkan e-mel ke <a>hello@agartha.example</a> dengan alamat yang anda gunakan untuk menempah.',
    footnote:
      "Kami akan menghantar kod 6 digit ke alamat pada tempahan anda. Kod ini tamat tempoh dalam 5 minit.",
  },
  verify: {
    metaTitle: "Sahkan tempahan anda · AgarthaOS",
    metaDescription:
      "Masukkan kod 6 digit yang baru kami hantar ke e-mel anda untuk mengakses tempahan anda.",
    title: "Masukkan kod anda",
    subtitle:
      "Kami menghantar kod 6 digit ke <email>{maskedEmail}</email>. Masukkan di bawah untuk mengakses tempahan <ref>{bookingRef}</ref>.",
    codeLabel: "Kod pengesahan",
    ctaSubmit: "Sahkan dan teruskan",
    ctaSubmitting: "Mengesahkan…",
    resendCta: "Hantar semula kod",
    resendCountdown: "Hantar semula dalam {label}",
    resendCountdownLabelMinutes: "{minutes}:{seconds}",
    resendCountdownLabelSeconds: "{seconds}s",
    resendSending: "Menghantar…",
    resendSentTitle: "Kod dihantar",
    resendSentBody: "Kami telah menghantar kod baharu ke {maskedEmail}.",
    wrongBookingPrompt: "Tempahan salah?",
    useDifferentRef: "Guna rujukan yang lain",
    errorInvalid: "Kod tersebut tidak sepadan. Sila cuba lagi.",
    errorExpired: "Kod tersebut telah tamat tempoh. Sila minta yang baharu.",
    errorLocked: "Terlalu banyak percubaan salah. Sila minta kod yang baharu.",
    errorGeneric: "Tidak dapat mengesahkan kod. Sila cuba lagi.",
    alertTitle: "Kami tidak dapat melog masukkan anda",
  },
  manage: {
    metaTitle: "Tempahan saya · AgarthaOS",
    metaDescription:
      "Lihat kod QR anda, uruskan tetamu, dan ubah jadual lawatan AgarthaOS anda.",
    title: "Tempahan anda",
    rescheduleClosedTitle: "Penjadualan semula telah ditutup",
    rescheduleClosedBody:
      "Kami menutup perubahan {hours} jam sebelum waktu masuk. Pasukan kami boleh membantu di pintu masuk.",
    rescheduleAvailableTitle: "Pindah ke masa yang lain",
    rescheduleAvailableBody:
      "Percuma sehingga {hours} jam sebelum waktu masuk. Pakej dan tetamu kekal sama.",
    rescheduleCta: "Jadualkan semula",
    biometricsTitle: "Sediakan Bayaran Muka & Tangkapan-Auto",
    biometricsBody:
      "Pilihan — bayar dengan satu pandangan dan simpan foto anda secara automatik.",
    memoriesTitle: "Lihat memori anda",
    memoriesBody: "Foto yang ditangkap secara automatik semasa lawatan anda.",
    feedbackTitle: "Beritahu kami tentang lawatan anda",
    feedbackBody: "Maklum balas seminit membantu kami menambah baik untuk tetamu seterusnya.",
    attendeesTitle: "Tetamu",
    attendeesCount: "{count, plural, other {# orang}}",
    attendeesHint:
      "Tap mana-mana tetamu untuk menambah nama panggilan atau menogol pilihan Bayaran Muka & Tangkapan-Auto.",
    cancelledTitle: "Tempahan ini telah dibatalkan",
    cancelledBody:
      "Pengeditan dinyahaktifkan. Jika ini di luar jangkaan, hubungi kami di pintu masuk.",
    ticketHero: {
      label: "Tunjukkan ini di pintu masuk",
      viewLargeQr: "Tap QR untuk membesarkan",
      ariaLabel: "Tiket tempahan anda",
      qrAria: "Kod QR untuk tempahan {ref}",
      qrFooter:
        "Imbas di pintu masuk, atau bacakan rujukan kepada anggota kakitangan.",
      dateLabel: "Tarikh",
      entryLabel: "Masuk",
      guestsLabel: "Tetamu",
      durationSuffix: "{minutes}m",
      guestSummaryAdults: "{count, plural, other {# orang dewasa}}",
      guestSummaryChildren: "{count, plural, other {# orang kanak-kanak}}",
      checkedInAt: "Daftar masuk pada {datetime}",
      perksToggle: "Apa yang termasuk ({count})",
      statusLabel: {
        pending_payment: "Menunggu pembayaran",
        confirmed: "Disahkan",
        checked_in: "Telah daftar masuk",
        completed: "Lawatan selesai",
        no_show: "Tidak hadir",
        cancelled: "Dibatalkan",
      },
    },
    actions: {
      addToCalendar: "Tambah ke kalendar",
      printTicket: "Cetak tiket",
      resendEmail: "Hantar semula e-mel pengesahan",
      calendarToastTitle: "Jemputan kalendar dimuat turun",
      calendarToastBody: "Buka fail .ics untuk menambahnya ke kalendar anda.",
    },
    manageCard: {
      title: "Uruskan lawatan anda",
      rescheduleLabel: "Jadualkan semula",
      rescheduleHint: "Pindah slot anda sehingga 2 jam sebelum waktu masuk.",
      biometricsLabel: "Bayaran Muka & Tangkapan-Auto",
      biometricsHint: "Sediakan ciri biometrik untuk lawatan anda.",
      memoriesLabel: "Foto & memori",
      memoriesHint: "Lihat dan muat turun foto dari lawatan anda.",
    },
    attendees: {
      title: "Tetamu",
      subtitle: "Tetapkan nama panggilan dan keutamaan ciri untuk semua orang dalam kumpulan anda.",
      nicknameLabel: "Nama panggilan",
      nicknamePlaceholderAdult: "cth. Mama",
      nicknamePlaceholderChild: "cth. Lili",
      nicknameMax: 40,
      facePay: "Bayaran Muka",
      autoCapture: "Tangkapan-Auto foto",
      facePayDescBio: "Membenarkan pembelian dalam taman melalui pengecaman muka.",
      facePayDescNoBio: "Memerlukan pendaftaran biometrik terlebih dahulu.",
      autoCaptureDescBio: "Menyimpan foto tetamu ini secara automatik.",
      autoCaptureDescNoBio: "Memerlukan pendaftaran biometrik terlebih dahulu.",
      biometricEnrolled: "Biometrik telah didaftarkan",
      setupBiometric: "Sediakan biometrik",
      saveCta: "Simpan",
      savingCta: "Menyimpan…",
      saveSuccessTitle: "Disimpan",
      saveSuccessBody: "Kemas kini {label}.",
      subRoleAdult: "Dewasa",
      subRoleChild: "Kanak-kanak",
      flagNotEnrolled: "Belum didaftarkan",
      flagEnrolledFeaturesOff: "Didaftarkan · ciri dimatikan",
      flagEnrolledWithFeatures: "Didaftarkan · {features}",
    },
    reschedule: {
      title: "Pindah tempahan anda",
      subtitle:
        "Pilih tarikh baharu, kemudian masa. Kami hanya menukar masa — pakej dan tetamu kekal sama.",
      newDateLabel: "Tarikh baharu",
      newTimeLabel: "Masa baharu",
      slotsErrorTitle: "Slot tidak dapat dimuatkan",
      slotsErrorBody: "Tidak dapat memuatkan slot — sila cuba lagi.",
      save: "Sahkan penjadualan semula",
      saving: "Menjadualkan semula…",
      successTitle: "Tempahan dipindahkan",
      successCopy: "Masa baharu: {date} pada {time}.",
      submitHeading: "Pindahkan tempahan saya",
      submitMeta: "{date} · {time}",
      submitFallback: "Pilih masa baharu",
      submitMoving: "Memindahkan…",
      keepCurrent: "Kekalkan masa semasa",
      alertTitle: "Kami tidak dapat memindahkannya",
      errorGeneric: "Tidak dapat menjadualkan semula — sila cuba lagi.",
      triggerDefault: "Pindah ke masa yang lain",
      errors: {
        tooLate: "Penjadualan semula ditutup 2 jam sebelum waktu masuk anda.",
        sameSlot: "Itu sudah merupakan slot semasa anda — pilih masa yang berbeza.",
        slotFull: "Slot tersebut baru sahaja habis dijual — sila pilih masa lain.",
        facilityFull: "Kemudahan penuh pada masa itu — sila pilih slot lain.",
        promoDayInvalid: "Kod promosi anda tidak sah pada hari itu.",
        promoTimeInvalid: "Kod promosi anda tidak sah pada masa itu.",
      },
    },
  },
  biometrics: {
    metaTitle: "Bayaran Muka & privasi · AgarthaOS",
    metaDescription:
      "Uruskan pendaftaran Bayaran Muka, persetujuan, dan sejarah audit untuk setiap tetamu pada tempahan anda.",
    title: "Bayaran Muka & privasi",
    subtitle:
      "Tentukan bagi setiap tetamu sama ada AgarthaOS boleh memproses templat muka untuk Bayaran Muka dan Tangkapan-Auto semasa lawatan anda. Baca pendedahan di bawah, kemudian berikan persetujuan untuk setiap orang yang anda ingin daftarkan.",
    attendeeSectionTitle: "Keputusan setiap tetamu",
    attendeeCount: "{count, plural, other {# orang tetamu}}",
    emptyTitle: "Belum ada tetamu pada tempahan ini.",
    emptyBody:
      "Sebaik sahaja tetamu dikonfigurasikan, mereka akan muncul di sini untuk keputusan persetujuan individu.",
    privacyContact:
      "Hubungan privasi: <a>{email}</a> · Versi polisi <v>{version}</v>",
    retentionFootnote:
      "Templat dipadam secara automatik 24 jam selepas lawatan anda berakhir, atau sebaik sahaja anda menarik balik. Penarikan balik tidak menjejaskan tempahan anda.",
    disclosureTitle: "Pendedahan privasi",
    disclosureSubtitle:
      "Apa yang kami tangkap, kenapa, tempoh penyimpanan & hak anda untuk menarik balik — bacaan wajib.",
    disclosureBody:
      "Vektor biometrik disimpan dalam keadaan tersulit, digunakan hanya di dalam kemudahan, dan dipadam 24 jam selepas lawatan anda berakhir. Anda boleh menarik balik persetujuan pada bila-bila masa.",
    policyVersion: "Versi polisi: {version}",
    grantCta: "Berikan persetujuan",
    withdrawCta: "Tarik balik persetujuan",
    withdrawConfirmTitle: "Tarik balik persetujuan?",
    withdrawConfirmBody:
      "Data biometrik anda akan dipadam serta-merta. Anda boleh memilih semula pada bila-bila masa.",
    noEnrolment: "Pendaftaran biometrik dibuka semasa lawatan anda.",
    active: "Aktif",
    withdrawn: "Ditarik balik",
    disclosureIntro:
      "Bayaran Muka dan Tangkapan-Auto bergantung pada templat muka — cap matematik yang diperoleh daripada foto. Kami memerlukan persetujuan eksplisit anda sebelum kami memprosesnya. Jika ada apa-apa yang tidak jelas, hubungi <a>{email}</a> sebelum bersetuju.",
    disclosureItems: {
      captureTitle: "Apa yang kami tangkap",
      captureBody:
        "Templat matematik yang diperoleh daripada foto muka — bukan foto itu sendiri. Imej mentah dibuang sebaik sahaja templat diekstrak.",
      purposeTitle: "Mengapa kami memerlukannya",
      purposeBody:
        "Untuk membenarkan pembelian dalam taman melalui Bayaran Muka, dan (pilihan) untuk menyimpan foto anda secara automatik semasa lawatan.",
      legalTitle: "Asas perundangan",
      legalBody:
        "Persetujuan eksplisit di bawah GDPR Art. 9(2)(a), pelepasan bertulis BIPA §15, dan PDPA Sek. 6. Kami hanya memproses data ini kerana anda membenarkannya.",
      retentionTitle: "Tempoh penyimpanan",
      retentionBody:
        "Templat dipadam secara automatik 24 jam selepas lawatan anda berakhir, atau serta-merta apabila anda menarik balik persetujuan — yang mana lebih awal.",
      withdrawTitle: "Hak anda untuk menarik balik",
      withdrawBody:
        "Tarik balik pada bila-bila masa, di halaman ini. Penarikan balik adalah serta-merta, memadam templat anda, dan TIDAK menjejaskan tempahan anda.",
      controllerTitle: "Pengawal & polisi",
      controllerBody:
        "AgarthaOS Sdn Bhd · Hubungan privasi <a>{email}</a> · Versi polisi <v>{version}</v>",
    },
    summaryEnrolledActive: "Didaftarkan & aktif",
    summaryConsentedAtGate: "Bersetuju · pendaftaran di pintu masuk",
    summaryConsentWithdrawn: "Persetujuan ditarik balik",
    summaryNoConsent: "Belum ada persetujuan",
    pillActiveConsent: "Persetujuan aktif",
    pillWithdrawn: "Ditarik balik",
    pillNoConsent: "Belum ada persetujuan",
    previouslyWithdrawnTitle: "Anda telah menarik balik sebelum ini",
    previouslyWithdrawnBody:
      "Persetujuan terdahulu anda telah ditarik balik pada {date}. Anda boleh memberikan persetujuan semula di bawah jika anda telah berubah fikiran.",
    consentCheckboxLabel:
      "Saya telah membaca pendedahan di atas dan bersetuju AgarthaOS memproses templat muka untuk <name>{label}</name> bagi tujuan Bayaran Muka dan Tangkapan-Auto, disimpan sehingga 24 jam selepas lawatan ini.",
    grantSavedTitle: "Persetujuan direkodkan",
    grantReusedTitle: "Sudah bersetuju",
    grantSavedBodyNew: "{label}: anda boleh mendaftar pada hari lawatan anda.",
    grantReusedBody: "{label}: persetujuan sedia ada anda masih aktif.",
    withdrawSuccessTitle: "Persetujuan ditarik balik",
    withdrawSuccessBody:
      "{label}: templat muka dipadam; Bayaran Muka dan Tangkapan-Auto dimatikan.",
    consentGrantedOn: "Persetujuan diberikan pada {date}",
    policyVersionInline: "Versi polisi <v>{version}</v>",
    enrolmentEnrolledTitle: "Didaftarkan",
    enrolmentEnrolledBody:
      "Templat muka anda telah disimpan. Tap Bayaran Muka di mana-mana titik jualan semasa lawatan anda.",
    enrolmentPendingTitle: "Pendaftaran dibuka semasa lawatan anda",
    enrolmentPendingBody:
      "Kami akan menangkap templat muka di pintu masuk apabila anda tiba — tiada langkah tambahan diperlukan di sini.",
    withdrawConfirmAck: {
      templateDeleted: "Templat muka anda (jika didaftarkan) dipadam daripada sistem kami.",
      featuresOff: "Bayaran Muka dan Tangkapan-Auto dimatikan untuk tetamu ini.",
      bookingUnaffected: "Tempahan anda tidak terjejas — anda masih boleh masuk dan menikmati lawatan.",
      canReConsent: "Anda boleh memberikan persetujuan semula di halaman ini pada bila-bila masa.",
    },
    withdrawConfirmCta: "Tarik balik & padam",
    withdrawKeepCta: "Kekalkan persetujuan",
    withdrawConfirmDescription: "Tindakan ini serta-merta dan tidak boleh dibatalkan dari halaman ini.",
    grantingCta: "Menyimpan…",
    auditToggleTitle: "Sejarah audit",
    auditCount: "({count})",
    auditMatchAttempts: "{count, plural, other {# percubaan padanan}}",
    auditEmpty:
      "Belum ada aktiviti. Sebaik sahaja didaftarkan, setiap bacaan templat anda dilog di sini.",
    auditEvent: {
      enroll: "Templat didaftarkan",
      match_attempt: "Percubaan padanan",
      withdraw_and_delete: "Templat dipadam (anda menarik balik)",
      auto_delete_retention: "Templat dipadam secara automatik (tempoh simpan)",
      dsr_erasure: "Templat dihapuskan (permintaan privasi)",
    },
    auditMatchApproved: "Diluluskan",
    auditMatchDenied: "Ditolak",
    auditActorBy: "oleh anda",
    auditActorByStaff: "oleh kakitangan",
    auditActorBySystem: "oleh sistem",
    attendeeAdult: "Dewasa",
    attendeeChild: "Kanak-kanak",
    withdrawConfirmTitleWithLabel: "Tarik balik persetujuan untuk {label}?",
  },
  memories: {
    metaTitle: "Memori anda · AgarthaOS",
    metaDescription: "Lihat dan muat turun foto dari lawatan AgarthaOS anda.",
    title: "Memori anda",
    subtitle:
      "{count, plural, =0 {Tiada foto lagi} other {# foto}} dari {date}. Tersedia sehingga {expiry} — muat turun apa sahaja yang anda mahu simpan.",
    subtitleFallback: "Belum ada foto yang ditangkap.",
    downloadCta: "Muat turun",
    shareCta: "Salin pautan",
    shareCopied: "Pautan disalin — tamat tempoh dalam {minutes} minit.",
    shareCopyDescription:
      "Sesiapa sahaja yang mempunyai pautan ini boleh melihatnya untuk {minutes} minit yang seterusnya.",
    shareCopiedTitle: "Pautan disalin",
    shareExpiresLabel: "Tamat tempoh dalam {minutes} minit",
    ariaCapturedPhotos: "Foto yang ditangkap",
    ariaPagination: "Halaman foto",
    paginationLabel:
      "Halaman {page} daripada {total} · {count, plural, other {# foto}}",
    paginationPrevious: "Sebelumnya",
    paginationNext: "Seterusnya",
    ariaPhotoOfAttendee: "Foto {attendee}",
    ariaPhotoGeneric: "Foto yang ditangkap dari lawatan anda",
    photoBroken: "Foto ini tidak dapat dimuatkan. Sila muat semula halaman.",
    photoExpiresOn: "Tamat tempoh {date}",
    photoUnmatched: "Tidak dipadankan",
    photoActionsAria: "Lebih banyak tindakan foto",
    photoDownloadAria: "Muat turun foto",
    empty: {
      preVisitTitle: "Foto anda akan muncul di sini selepas lawatan anda.",
      preVisitBody:
        "Foto yang ditangkap secara automatik akan muncul sebaik sahaja diambil — pastikan Bayaran Muka disediakan untuk orang yang anda ingin tag.",
      preVisitCta: "Sediakan Bayaran Muka",
      noOptInTitle: "Tangkapan-Auto tidak diaktifkan untuk mana-mana tetamu.",
      noOptInBody:
        "Foto hanya ditangkap apabila tetamu yang berdaftar melalui titik tangkapan dengan Tangkapan-Auto diaktifkan. Anda boleh mengaktifkannya untuk lain kali daripada halaman tempahan.",
      noOptInCta: "Kembali ke tempahan saya",
      noPhotosTitle: "Kami tidak menangkap sebarang detik dalam lawatan ini.",
      noPhotosBody:
        "Tangkapan-Auto hanya dicetuskan apabila tetamu yang berdaftar melalui titik tangkapan. Cuba sapa kami di pintu masuk pada lain kali.",
    },
  },
  survey: {
    metaTitle: "Beritahu kami tentang lawatan anda · AgarthaOS",
    metaDescription:
      "Kongsi maklum balas tentang lawatan AgarthaOS anda. Mengambil masa lebih kurang seminit dan membantu kami menambah baik.",
    title: "Beritahu kami tentang lawatan anda",
    subtitle:
      "Mengambil masa lebih kurang seminit. Hanya soalan pertama wajib — yang lain adalah bonus.",
    bookingPill: "Untuk tempahan <code>{ref}</code>",
    q1: {
      title: "Bagaimanakah lawatan anda?",
      subtitle: "Wajib · pilih nombor dari 0 hingga 10",
      low: "Buruk",
      high: "Cemerlang",
    },
    q2: {
      title: "Sejauh mana anda mungkin mengesyorkan kami?",
      subtitle: "Pilihan · skala 0–10",
      low: "Tidak sama sekali",
      high: "Pasti sekali",
    },
    q3: {
      title: "Apa yang menonjol?",
      subtitle: "Pilihan · pilih mana-mana yang berkenaan",
    },
    q4: {
      title: "Ada apa-apa lagi?",
      subtitle: "Pilihan · apa yang menjadikannya hebat, apa yang boleh kami tambah baik",
      placeholder: "Beritahu kami dengan kata-kata anda sendiri…",
    },
    ctaSend: "Hantar maklum balas",
    ctaSending: "Menghantar…",
    readyHelper: "Terima kasih — sedia bila-bila anda bersedia.",
    pickRatingHelper: "Pilih penilaian dalam soalan pertama untuk menghantar.",
    ariaStandoutTopics: "Topik yang menonjol",
    ariaOverallRating: "Penilaian lawatan keseluruhan",
    ariaRecommendationLikelihood: "Kebarangkalian untuk mengesyorkan",
    ariaFreeTextFeedback: "Maklum balas teks bebas",
    feedbackCounter: "{current} / {max}",
    confirmation: {
      title: "Terima kasih — maklum balas anda telah dihantar.",
      body:
        "Kami membaca setiap respons. Pasukan akan menggunakannya untuk memperbaiki pengalaman bagi tetamu seterusnya.",
      back: "Kembali ke halaman utama",
    },
    errors: {
      alertTitle: "Kami tidak dapat menghantar maklum balas anda",
      rateLimited:
        "Kami baru-baru ini telah menerima maklum balas daripada rangkaian anda. Sila cuba lagi sebentar lagi.",
      validation: "Sila semak semula jawapan anda dan cuba lagi.",
      generic: "Kami tidak dapat menghantar maklum balas anda. Sila cuba lagi.",
    },
  },
  privacy: {
    title: "Privasi",
    intro: "Cara kami mengendalikan data anda di AgarthaOS.",
  },
  terms: {
    title: "Terma",
    intro: "Terma yang mengawal tempahan AgarthaOS anda.",
  },
};

const ms = JSON.parse(readFileSync(MS_PATH, "utf8"));
ms.guest = guest;
writeFileSync(MS_PATH, JSON.stringify(ms, null, 2) + "\n");
process.stdout.write(
  `wrote Bahasa Malaysia translation to ${MS_PATH} (${Object.keys(guest).length} top-level keys)\n`,
);
