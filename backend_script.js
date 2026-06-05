/**
 * ============================================================
 * BUKU INDUK PENDUDUK — Google Apps Script Backend (UPDATED)
 * ============================================================
 * PERBAIKAN:
 * 1. Otomatisasi generate Tanggal Lahir langsung dari NIK.
 * 2. Mengunci format tanggal dengan petik (') agar tidak dirusak oleh Google Sheets.
 * 3. Memperbaiki fungsi renumberRows agar tidak lag/error (menggunakan Batch Update).
 * ============================================================
 */

const SPREADSHEET_ID = '1MrXN78SOEQCH2hyZKIa43UMXJ14AV43sQDDtOaEQkUo'; // ganti jika perlu
const SHEET_NAME = 'ALL DATA';

// Kolom header (sesuai spreadsheet Anda)
const COL = {
  NO: 0,           // A
  NO_KK: 1,        // B
  ALAMAT: 2,       // C
  NAMA_KK: 3,      // D
  NO_RW: 4,        // E
  NO_RT: 5,        // F
  NIK: 6,          // G
  NAMA_LENGKAP: 7, // H
  STATUS: 8,       // I
  JK: 9,           // J
  TEMPAT_LAHIR: 10,// K
  TGL_LAHIR: 11,   // L
  GOL_DARAH: 12,   // M
  AGAMA: 13,       // N
  PENDIDIKAN: 14,  // O
  PEKERJAAN: 15,   // P
  STATUS_KAWIN: 16,// Q
  NAMA_IBU: 17,    // R
  NAMA_AYAH: 18,   // S
  NO_PASPOR: 19,   // T
  TGL_PASPOR: 20,  // U
};

function doGet(e) {
  const params = e.parameter;
  const action = params.action || '';
  let result;
  if (action === 'checkKK') result = checkKKExists(cleanDigits(params.kk || ''));
  else if (action === 'checkNIK') result = checkNIKExists(cleanDigits(params.nik || ''));
  else if (action === 'getAll') result = getAllRecords();
  else result = { status: 'ok', message: 'Buku Induk API' };
  
  return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
}

// Tambahkan konstanta ini
const SHEET_USERS = 'USERS';

// Tambahkan atau perbarui fungsi loginPetugas
function loginPetugas(nik, password) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEET_USERS);
  if (!sheet) return { success: false, message: 'Database user belum disiapkan.' };
  
  const data = sheet.getDataRange().getValues();
  // Header: NIK(0), NAMA(1), ALAMAT(2), TGL_LAHIR(3), PASSWORD(4)
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === nik && String(data[i][4]) === password) {
      return { success: true, nama: data[i][1] };
    }
  }
  return { success: false, message: 'NIK atau Password salah.' };
}

// Perbarui fungsi doPost untuk menangani action 'login'
function doPost(e) {
  let result;
  try {
    const payload = JSON.parse(e.postData.contents);
    if (payload.action === 'submitKK') result = insertKKData(payload);
    else if (payload.action === 'login') result = loginPetugas(payload.nik, payload.password);
    else result = { success: false, message: 'Unknown action' };
  } catch (err) {
    result = { success: false, message: err.toString() };
  }
  return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
}

function cleanDigits(s) { return String(s).replace(/\D/g, ''); }

function normalizeKKNIK(val) { return cleanDigits(String(val || '').replace(/^'/, '')); }

// ============================================================
// FUNGSI BARU: EKSTRAK TGL LAHIR DARI NIK
// ============================================================
function extractDOBFromNIK(nikRaw) {
  var nik = cleanDigits(nikRaw);
  if (nik.length === 16) {
    var dd = parseInt(nik.substring(6, 8), 10);
    var mm = nik.substring(8, 10);
    var yyStr = nik.substring(10, 12);
    
    // Jika perempuan (tanggal lahir > 40), kurangi 40
    if (dd > 40) {
      dd -= 40;
    }
    
    var ddStr = dd < 10 ? '0' + dd : String(dd);
    
    // Asumsi tahun: Jika 2 digit lebih dari tahun saat ini berarti 19XX, jika tidak 20XX
    var currentYear = new Date().getFullYear() % 100;
    var yy = parseInt(yyStr, 10);
    var yyyy = (yy <= currentYear) ? '20' + yyStr : '19' + yyStr;
    
    // Return format string dgn tanda petik (') agar Sheets membacanya mutlak sebagai text & terbaca di Database
    return "'" + ddStr + "/" + mm + "/" + yyyy;
  }
  return "";
}

function checkKKExists(kkDigits) {
  if (!kkDigits || kkDigits.length !== 16) return { exists: false };
  const sheet = getSheet();
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (normalizeKKNIK(row[COL.NO_KK]) === kkDigits) {
      const namaKK = row[COL.NAMA_KK] || row[COL.NAMA_LENGKAP] || '';
      const alamat = String(row[COL.ALAMAT] || '');
      const rw = String(row[COL.NO_RW] || '');
      const rt = String(row[COL.NO_RT] || '');
      let count = 0;
      for (let j = 1; j < data.length; j++) if (normalizeKKNIK(data[j][COL.NO_KK]) === kkDigits) count++;
      return { exists: true, data: { namaKK, alamat, rw, rt, jumlahAnggota: count } };
    }
  }
  return { exists: false };
}

function checkNIKExists(nikDigits) {
  if (!nikDigits || nikDigits.length !== 16) return { exists: false };
  const sheet = getSheet();
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (normalizeKKNIK(data[i][COL.NIK]) === nikDigits) {
      return {
        exists: true,
        nama: String(data[i][COL.NAMA_LENGKAP] || ''),
        alamat: String(data[i][COL.ALAMAT] || ''),
        kk: normalizeKKNIK(data[i][COL.NO_KK])
      };
    }
  }
  return { exists: false };
}

// ============================================================
// PERBAIKAN getAllRecords: KIRIM SEMUA KOLOM
// ============================================================
function getAllRecords() {
  const sheet = getSheet();
  const data = sheet.getDataRange().getDisplayValues(); // getDisplayValues agar tanggal aman terformat string
  const records = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row[COL.NO_KK]) continue;
    records.push({
      noKK: normalizeKKNIK(row[COL.NO_KK]),
      nik: normalizeKKNIK(row[COL.NIK]),
      nama: String(row[COL.NAMA_LENGKAP] || ''),
      namaKK: String(row[COL.NAMA_KK] || ''),
      alamat: String(row[COL.ALAMAT] || ''),
      rw: String(row[COL.NO_RW] || ''),
      rt: String(row[COL.NO_RT] || ''),
      // KOLOM YANG SEBELUMNYA HILANG:
      statusHubungan: String(row[COL.STATUS] || ''),
      jenisKelamin: String(row[COL.JK] || ''),
      tempatLahir: String(row[COL.TEMPAT_LAHIR] || ''),
      tanggalLahir: String(row[COL.TGL_LAHIR] || ''),
      golonganDarah: String(row[COL.GOL_DARAH] || ''),
      agama: String(row[COL.AGAMA] || ''),
      pendidikan: String(row[COL.PENDIDIKAN] || ''),
      pekerjaan: String(row[COL.PEKERJAAN] || ''),
      statusKawin: String(row[COL.STATUS_KAWIN] || ''),
      namaIbu: String(row[COL.NAMA_IBU] || ''),
      namaAyah: String(row[COL.NAMA_AYAH] || '')
    });
  }
  return { records };
}

function insertKKData(payload) {
  const sheet = getSheet();
  const noKK = String(payload.noKK || '');
  const alamat = String(payload.alamat || '').toUpperCase();
  const rw = String(payload.noRW || '');
  const rt = String(payload.noRT || '');
  const namaKK = String(payload.namaKK || '').toUpperCase();
  const members = payload.members || [];
  const isEdit = payload.isEdit === true;
  
  if (!members.length) return { success: false, message: 'Tidak ada data anggota.' };

  const allData = sheet.getDataRange().getValues();
  // Jika ini mode Edit/Update, HAPUS terlebih dahulu seluruh anggota dari KK tersebut lama
  if (isEdit) {
     let rowsToDelete = [];
     const cleanNoKK = normalizeKKNIK(noKK);
     for (let i = allData.length - 1; i >= 1; i--) {
        if (normalizeKKNIK(allData[i][COL.NO_KK]) === cleanNoKK) {
           rowsToDelete.push(i + 1); // 1-based index
        }
     }
     // Delete from bottom to top to avoid shifting indexes incorrectly
     for(let r of rowsToDelete) {
         sheet.deleteRow(r);
     }
  }

  // Refetch data after possible edits
  const refreshedData = sheet.getDataRange().getValues();
  const lastRow = refreshedData.length;
  let insertRow = lastRow + 1;
  let foundCluster = false;
  
  for (let i = 1; i < refreshedData.length; i++) {
    const r = refreshedData[i];
    const rAlamat = String(r[COL.ALAMAT] || '').toUpperCase().trim();
    const rRW = String(r[COL.NO_RW] || '').trim();
    const rRT = String(r[COL.NO_RT] || '').trim();
    
    if (rAlamat === alamat.trim() && rRW === rw.trim() && rRT === rt.trim()) {
      insertRow = i + 2;
      foundCluster = true;
    }
  }

  let maxNo = 0;
  for (let i = 1; i < refreshedData.length; i++) {
    const n = parseInt(refreshedData[i][COL.NO]) || 0;
    if (n > maxNo) maxNo = n;
  }

  const newRows = members.map((m, idx) => {
    maxNo++;
    const isFirst = idx === 0;

    // --- AUTO EKSTRAK TGL LAHIR ---
    let tglLahirStr = extractDOBFromNIK(m.nik);
    if (!tglLahirStr) {
       tglLahirStr = String(m.tanggalLahir || ''); 
       // Kunci format dengan apostrophe jika user input manual
       if (tglLahirStr && !tglLahirStr.startsWith("'")) tglLahirStr = "'" + tglLahirStr;
    }

    return [
      maxNo,                                    
      isFirst ? noKK : noKK, // SELALU ISI NOMOR KK UNTUK SETIAP ANGGOTA (perbaikan agar selalu terikat)   
      alamat,                                   
      isFirst ? namaKK : '',                    
      rw,                                       
      rt,                                       
      String(m.nik || ''),  
      String(m.namaLengkap || '').toUpperCase(),                                     
      String(m.statusHubungan || ''),           
      String(m.jenisKelamin || ''),             
      String(m.tempatLahir || '').toUpperCase(),
      tglLahirStr,             
      String(m.golonganDarah || '-'),           
      String(m.agama || ''),                    
      String(m.pendidikan || ''),               
      String(m.pekerjaan || ''),                
      String(m.statusKawin || ''),              
      String(m.namaIbu || '').toUpperCase(),    
      String(m.namaAyah || '').toUpperCase(),   
      '',                                 
      ''                                         
    ];
  });

  if (insertRow <= lastRow + 1 && foundCluster) {
    sheet.insertRowsBefore(insertRow, newRows.length);
    for (let k = 0; k < newRows.length; k++) {
      sheet.getRange(insertRow + k, 1, 1, newRows[k].length).setValues([newRows[k]]);
    }
  } else {
    for (const row of newRows) {
      sheet.appendRow(row);
    }
  }

  repairMisplacedData(); 

  return {
    success: true,
    message: isEdit ? "Update data anggota KK selesai direkam." : "Data berhasil disimpan."
  };
}

// PERBAIKAN: Penomoran Massal agar tidak LAG
function renumberRows(sheet) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return;
  const numRows = lastRow - 1;
  const values = [];
  for (let r = 1; r <= numRows; r++) {
    values.push([r]);
  }
  sheet.getRange(2, 1, numRows, 1).setValues(values);
}

function repairMisplacedData() {
  var sheet = getSheet();
  var allValues = sheet.getDataRange().getValues();
  var header   = allValues[0];
  var rawRows  = allValues.slice(1);
  if (rawRows.length === 0) return { moved: 0, message: 'Sheet kosong.' };
  
  var curKK = '', curAlamat = '', curNamaKK = '', curRW = 0, curRT = 0;
  
  var enriched = rawRows.map(function(row) {
    var kkRaw    = String(row[COL.NO_KK]   || '').trim();
    var almRaw   = String(row[COL.ALAMAT]  || '').trim();
    var nkkRaw   = String(row[COL.NAMA_KK] || '').trim();
    var rwRaw    = String(row[COL.NO_RW]   || '').trim();
    var rtRaw    = String(row[COL.NO_RT]   || '').trim();

    if (kkRaw)  curKK     = kkRaw;
    if (almRaw) curAlamat = almRaw.toUpperCase().trim();
    if (nkkRaw) curNamaKK = nkkRaw;
  
    if (rwRaw)  curRW     = parseInt(rwRaw, 10)  || curRW;
    if (rtRaw)  curRT     = parseInt(rtRaw, 10)  || curRT;

    // --- CEK DAN PERBAIKI TGL LAHIR ---
    var currentTglObj = row[COL.TGL_LAHIR];
    var currentTglStr = "";
    if (currentTglObj instanceof Date) {
        var d = currentTglObj.getDate();
        var m = currentTglObj.getMonth() + 1;
        var y = currentTglObj.getFullYear();
        currentTglStr = "'" + (d < 10 ? '0'+d : d) + "/" + (m < 10 ? '0'+m : m) + "/" + y;
        row[COL.TGL_LAHIR] = currentTglStr;
    } else {
        currentTglStr = String(currentTglObj || '').trim();
        if (!currentTglStr || currentTglStr === '-') {
            var nikRaw = String(row[COL.NIK] || '');
            var extractedTgl = extractDOBFromNIK(nikRaw);
            if (extractedTgl) {
                row[COL.TGL_LAHIR] = extractedTgl;
            }
        } else if (!currentTglStr.startsWith("'")) {
            row[COL.TGL_LAHIR] = "'" + currentTglStr;
        }
    }

    return { row: row, kk: curKK, alamat: curAlamat, namaKK: curNamaKK, rw: curRW, rt: curRT };
  });
  
  var kkMap = {};
  enriched.forEach(function(e) {
    var key = normalizeKKNIK(e.kk) || e.kk || 'UNKNOWN';
    if (!kkMap[key]) {
      kkMap[key] = { kk: e.kk, alamat: e.alamat, namaKK: e.namaKK, rw: e.rw, rt: e.rt, rows: [] };
    }
    kkMap[key].rows.push(e.row);
  });
  
  var families = Object.values(kkMap);
  families.sort(function(a, b) {
    if (a.rw !== b.rw) return a.rw - b.rw;
    if (a.rt !== b.rt) return a.rt - b.rt;
    var cmpAlamat = a.alamat.localeCompare(b.alamat, 'id');
    if (cmpAlamat !== 0) return cmpAlamat;
    var aKK = normalizeKKNIK(a.kk) || a.kk;
    var bKK = normalizeKKNIK(b.kk) || b.kk;
    return aKK.localeCompare(bKK);
  });
  
  var sortedRows = [];
  families.forEach(function(fam) { fam.rows.forEach(function(r) { sortedRows.push(r); }); });

  var numCols  = header.length;
  var lastRow  = sheet.getLastRow();
  
  if (lastRow > 1) {
    sheet.getRange(2, 1, lastRow - 1, numCols).clearContent();
  }
  
  sheet.getRange(2, 1, sortedRows.length, numCols).setValues(sortedRows);
  renumberRows(sheet);
  
  return { moved: 0, message: 'Sort selesai.' };
}

function getSheet() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEET_NAME);
  return sheet;
}

// ============================================================
// FUNGSI PENARIKAN DPT (DATA PEMILIH TETAP) PILKADES 2026
// ============================================================

function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu('⚙️ Menu Desa')
      .addItem('Tarik Data DPT (Pilkades 2026)', 'generateDPT')
      .addToUi();
}

function generateDPT() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheetData = ss.getSheetByName('ALL DATA');
  
  if (!sheetData) {
    SpreadsheetApp.getUi().alert('Sheet "ALL DATA" tidak ditemukan!');
    return;
  }

  let sheetDPT = ss.getSheetByName('DPT');
  if (!sheetDPT) {
    sheetDPT = ss.insertSheet('DPT');
  } else {
    sheetDPT.clear(); // Bersihkan isi dan format lama jika sudah ada
  }

  const data = sheetData.getDataRange().getValues();
  if (data.length <= 1) {
    SpreadsheetApp.getUi().alert('Data penduduk masih kosong.');
    return;
  }

  // --- PERBAIKAN: Copy persis Header beserta format (warna, border, font) dari ALL DATA ---
  const numCols = sheetData.getLastColumn();
  sheetData.getRange(1, 1, 1, numCols).copyTo(sheetDPT.getRange(1, 1));
  sheetDPT.setFrozenRows(1); // Bekukan baris pertama (Header)

  const header = data[0];
  const rows = data.slice(1);
  const dptRows = [];

  // Konfigurasi Kolom (Indeks array dimulai dari 0)
  const COL_TGL = 11;    // Kolom L (Tanggal Lahir)
  const COL_KAWIN = 16;  // Kolom Q (Status Perkawinan)

  rows.forEach(row => {
    const tglRaw = String(row[COL_TGL] || '').replace(/'/g, '').trim();
    const kawin = String(row[COL_KAWIN] || '').toUpperCase();
    
    let isEligible = false;

    // 1. SYARAT UU PEMILU: Sudah/Pernah Kawin otomatis berhak memilih (meski belum 17 th)
    if (kawin === 'KAWIN' || kawin === 'CERAI HIDUP' || kawin === 'CERAI MATI') {
      isEligible = true;
    }

    // 2. SYARAT USIA: >= 17 Tahun pada November 2026 (Lahir <= November 2009)
    if (!isEligible && tglRaw) {
       // Coba pisahkan format DD/MM/YYYY
       let parts = tglRaw.split('/');
       if (parts.length === 3) {
          let m = parseInt(parts[1], 10); // Bulan
          let y = parseInt(parts[2], 10); // Tahun

          if (y < 2009) {
             isEligible = true;
          } else if (y === 2009 && m <= 11) { // <-- BATAS BULAN NOVEMBER (11)
             isEligible = true;
          }
       } else {
          // Fallback jika formatnya ternyata YYYY-MM-DD
          parts = tglRaw.split('-');
          if (parts.length === 3) {
              let y = parseInt(parts[0], 10);
              let m = parseInt(parts[1], 10);
              if (y < 2009 || (y === 2009 && m <= 11)) { // <-- BATAS BULAN NOVEMBER (11)
                  isEligible = true;
              }
          }
       }
    }

    // Jika memenuhi syarat, masukkan ke daftar DPT
    if (isEligible) {
      dptRows.push(row);
    }
  });

  // Tulis Data ke Sheet DPT
  if (dptRows.length > 0) {
    // Reset Nomor Urut (Kolom A) khusus untuk di Sheet DPT
    for (let i = 0; i < dptRows.length; i++) {
       dptRows[i][0] = i + 1; 
    }
    sheetDPT.getRange(2, 1, dptRows.length, header.length).setValues(dptRows);
    SpreadsheetApp.getUi().alert('Berhasil!\n\n' + dptRows.length + ' penduduk telah masuk dalam kriteria DPT Pilkades November 2026.');
  } else {
    SpreadsheetApp.getUi().alert('Tidak ada data penduduk yang memenuhi kriteria DPT.');
  }
}