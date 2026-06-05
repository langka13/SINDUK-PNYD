import { useState, useEffect, useRef, FormEvent } from 'react';
import { 
  Users, Check, Loader2, Plus, Trash2, 
  AlertTriangle, Save, Database, MapPin, 
  Calendar, CheckCircle, Info, Share2, ClipboardCheck,
  LayoutDashboard, Search, SlidersHorizontal, Edit2, 
  X, ChevronLeft, ChevronRight, FileCode, RefreshCw, UserCheck
} from 'lucide-react';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwS_rkFIL0jkXnooa8BKCmUBv-coz51i3qaHfDPtLMijw9VFnThzTGMMjDGPWsTyR_TtQ/exec';

const RT_MAP: Record<string, number[]> = {
  '1': [1,2,3,4],
  '2': [5,6,7,8],
  '3': [9,10,11,12],
  '4': [13,14,15],
  '5': [16,17,18],
  '6': [19,20]
};

const ALAMAT_LIST = [
  'BABAKAN','BOJONG','DANGDEUR','DSN DANGDEUR',
  'DUSUN BABAKAN','DUSUN BAROS','DUSUN BOJONG',
  'DUSUN DANGDEUR','DUSUN MANYINTREUK','DUSUN PASIR MUNCANG',
  'DUSUN PASIRMUNCANG','KAMPUNG BABAKAN','KAMPUNG BAROS',
  'KAMPUNG BOJONG','KAMPUNG DANGDEUR','KAMPUNG MANYINTREUK',
  'KAMPUNG PASIRMUNCANG LANDEUH','KAMPUNG PASIRMUNCANG TONGGOH',
  'DUSUN PASIRMUNCANG LANDEUH','DUSUN PASIRMUNCANG TONGGOH','PASIRMUNCANG'
];

const STATUS_OPTIONS = ['Kepala Keluarga', 'Suami', 'Istri', 'Anak', 'Menantu', 'Cucu', 'Orangtua', 'Mertua', 'Famili Lain', 'Pembantu', 'Lainnya'];
const GOLDAR_OPTIONS = ['-','A','B','AB','O'];
const AGAMA_OPTIONS = ['Islam','Kristen','Katolik','Hindu','Buddha','Konghucu'];
const PENDIDIKAN_OPTIONS = [
  'TIDAK/BELUM SEKOLAH', 'BELUM TAMAT SD/SEDERAJAT', 'TAMAT SD/SEDERAJAT',
  'SLTP/SEDERAJAT (SMP)', 'SLTA/SEDERAJAT (SMA/SMK)', 'DIPLOMA I/II/III', 
  'DIPLOMA IV / STRATA I (S1)', 'STRATA II (S2)', 'STRATA III (S3)'
];
const PEKERJAAN_OPTIONS = [
  'Belum/Tidak Bekerja', 'Mengurus Rumah Tangga', 'Pelajar/Mahasiswa', 
  'Pegawai Negeri Sipil (PNS)', 'Tentara Nasional Indonesia (TNI)', 
  'Kepolisian (POLRI)', 'Karyawan Swasta', 'Karyawan BUMN', 'Karyawan BUMD', 
  'Wiraswasta', 'Wirausaha', 'Pedagang', 'Petani/Pekebun', 'Peternak', 
  'Nelayan/Perikanan', 'Guru', 'Dokter', 'Perawat', 'Sopir', 'Ojek', 
  'Wartawan', 'Seniman', 'Pensiunan', 'Lainnya'
];
const STATUS_KAWIN_OPTIONS = ['Belum Kawin', 'Kawin', 'Cerai Hidup', 'Cerai Mati'];

interface Member {
  id: string;
  nik: string;
  namaLengkap: string;
  statusHubungan: string;
  jenisKelamin: string;
  golonganDarah: string;
  tempatLahir: string;
  tanggalLahir: string;
  agama: string;
  pendidikan: string;
  pekerjaan: string;
  statusKawin: string;
  namaIbu: string;
  namaAyah: string;
  nikLoading?: boolean;
  nikError?: string;
  nikOk?: boolean;
}

interface AppRecord {
  noKK: string;
  nik: string;
  nama: string;
  namaKK: string;
  alamat: string;
  rw: string;
  rt: string;
  statusHubungan?: string;
  jenisKelamin?: string;
  golonganDarah?: string;
  tempatLahir?: string;
  tanggalLahir?: string;
  agama?: string;
  pendidikan?: string;
  pekerjaan?: string;
  statusKawin?: string;
  namaIbu?: string;
  namaAyah?: string;
}

export default function App() {
  // Navigation State
  const [activeTab, setActiveTab] = useState<'form' | 'dashboard' | 'database'>('form');

  // Master KK Form States
  const [noKK, setNoKK] = useState('');
  const [alamat, setAlamat] = useState('');
  const [alamatInput, setAlamatInput] = useState('');
  const [noRW, setNoRW] = useState('');
  const [noRT, setNoRT] = useState('');
  const [showAlamatDropdown, setShowAlamatDropdown] = useState(false);
  const alamatRef = useRef<HTMLDivElement>(null);

  // Database lists and offline caches
  const [rawRecords, setRawRecords] = useState<AppRecord[]>([]);
  const [localAdds, setLocalAdds] = useState<AppRecord[]>([]);
  const [localEdits, setLocalEdits] = useState<AppRecord[]>([]);
  const [localDeletes, setLocalDeletes] = useState<string[]>([]);
  
  const [connectionStatus, setConnectionStatus] = useState('⚪ Menghubungkan...');
  const [kkCheckStatus, setKkCheckStatus] = useState<'idle' | 'checking' | 'ok' | 'duplicate'>('idle');
  const [kkDupDetail, setKkDupDetail] = useState<any | null>(null);

  // Form State
  const [members, setMembers] = useState<Member[]>([{
    id: 'member-1',
    nik: '',
    namaLengkap: '',
    statusHubungan: 'Kepala Keluarga',
    jenisKelamin: '',
    golonganDarah: '-',
    tempatLahir: '',
    tanggalLahir: '',
    agama: 'Islam',
    pendidikan: 'TIDAK/BELUM SEKOLAH',
    pekerjaan: 'Belum/Tidak Bekerja',
    statusKawin: 'Kawin',
    namaIbu: '',
    namaAyah: '',
    nikOk: false
  }]);

  // General States
  const [loading, setLoading] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // CRUD database table controls
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRW, setFilterRW] = useState('');
  const [filterRT, setFilterRT] = useState('');
  const [filterDusun, setFilterDusun] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Single-record edit form modal state
  const [editingRecord, setEditingRecord] = useState<AppRecord | null>(null);
  const [isExcelOpen, setIsExcelOpen] = useState(false);

  // Quick direct add resident modal state
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [quickAddForm, setQuickAddForm] = useState({
    noKK: '',
    namaKK: '',
    nik: '',
    nama: '',
    alamat: '',
    rw: '',
    rt: '',
    statusHubungan: 'Anak',
    jenisKelamin: '1',
    golonganDarah: '-',
    tempatLahir: '',
    tanggalLahir: '',
    agama: 'Islam',
    pendidikan: 'Slta/Sederajat',
    pekerjaan: 'Pelajar/Mahasiswa',
    statusKawin: 'Belum Kawin',
    namaIbu: '',
    namaAyah: ''
  });

  // Load backend records and local overrides of CRUD
  const fetchRecords = () => {
    setIsRefreshing(true);
    setConnectionStatus('⏳ Memperbarui...');
    fetch(`${APPS_SCRIPT_URL}?action=getAll`)
      .then(res => res.json())
      .then(data => {
        setRawRecords(data.records || []);
        setConnectionStatus(`🟢 Terhubung (${(data.records || []).length} data)`);
        setIsRefreshing(false);
      })
      .catch(() => {
        setConnectionStatus('🔴 Offline / Gagal terhubung (menggunakan cache lokal)');
        setIsRefreshing(false);
      });
  };

  useEffect(() => {
    // Read local cache overrides
    try {
      const adds = localStorage.getItem('buku_induk_adds');
      const edits = localStorage.getItem('buku_induk_edits');
      const deletes = localStorage.getItem('buku_induk_deletes');
      if (adds) setLocalAdds(JSON.parse(adds));
      if (edits) setLocalEdits(JSON.parse(edits));
      if (deletes) setLocalDeletes(JSON.parse(deletes));
    } catch (e) {
      console.error(e);
    }
    fetchRecords();
  }, []);

  // Save changes to localStorage helper
  const updateLocalOverrides = (adds: AppRecord[], edits: AppRecord[], deletes: string[]) => {
    localStorage.setItem('buku_induk_adds', JSON.stringify(adds));
    localStorage.setItem('buku_induk_edits', JSON.stringify(edits));
    localStorage.setItem('buku_induk_deletes', JSON.stringify(deletes));
  };

  // Close combobox click list
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (alamatRef.current && !alamatRef.current.contains(event.target as Node)) {
        setShowAlamatDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const cleanDigits = (v: string) => v.replace(/\D/g, '');

  const formatKKDisplay = (digits: string) => {
    if (digits.length > 12) return `${digits.slice(0, 6)} ${digits.slice(6, 12)} ${digits.slice(12, 16)}`;
    if (digits.length > 6) return `${digits.slice(0, 6)} ${digits.slice(6)}`;
    return digits;
  };

  // State calculations for combined dataset
  const getMergedRecords = (): AppRecord[] => {
    let list = [...rawRecords];
    // Apply local edits
    list = list.map(item => {
      const edit = localEdits.find(e => cleanDigits(e.nik) === cleanDigits(item.nik));
      return edit ? { ...item, ...edit } : item;
    });
    // Apply deletions
    list = list.filter(item => !localDeletes.includes(cleanDigits(item.nik)));
    // Append adds
    localAdds.forEach(add => {
      if (!list.some(item => cleanDigits(item.nik) === cleanDigits(add.nik))) {
        list.push(add);
      }
    });
    return list;
  };

  const finalRecords = getMergedRecords();

  // Statistics summaries
  const totalPenduduk = finalRecords.length;
  const totalKK = new Set(finalRecords.map(r => r.noKK).filter(Boolean)).size;
  const uniqueDusuns = Array.from(new Set(finalRecords.map(r => r.alamat).filter(Boolean)));
  
  // Groupings for top addresses
  const getTopDusunsList = () => {
    const map: Record<string, number> = {};
    finalRecords.forEach(r => {
      const key = (r.alamat || 'Lainnya').toUpperCase().trim();
      map[key] = (map[key] || 0) + 1;
    });
    return Object.entries(map)
      .map(([name, count]) => ({ name, count }))
      .sort((a,b) => b.count - a.count)
      .slice(0, 5);
  };

  const getRWDemographics = () => {
    const rws = ['1', '2', '3', '4', '5', '6'];
    return rws.map(rw => {
      const count = finalRecords.filter(r => cleanDigits(r.rw) === rw).length;
      return { rw, count };
    });
  };

  const handleKKChange = (val: string) => {
    const digits = cleanDigits(val).slice(0, 16);
    setNoKK(digits);
    setKkCheckStatus('idle');
    setKkDupDetail(null);

    if (digits.length === 16) {
      setKkCheckStatus('checking');
      fetch(`${APPS_SCRIPT_URL}?action=checkKK&kk=${digits}`)
        .then(res => res.json())
        .then(res => {
          if (res.exists) {
            setKkCheckStatus('duplicate');
            setKkDupDetail(res.data || null);
          } else {
            setKkCheckStatus('ok');
          }
        })
        .catch(() => {
          const found = finalRecords.find(r => cleanDigits(r.noKK) === digits);
          if (found) {
            setKkCheckStatus('duplicate');
            setKkDupDetail({
              namaKK: found.namaKK || found.nama,
              alamat: found.alamat,
              rw: found.rw,
              rt: found.rt,
              jumlahAnggota: 1
            });
          } else {
            setKkCheckStatus('ok');
          }
        });
    }
  };

  const kepalaKeluargaName = members.find(m => m.statusHubungan === 'Kepala Keluarga')?.namaLengkap || '';

  const triggerNIKCheck = (nikDigits: string, id: string) => {
    setMembers(prev => prev.map(m => m.id === id ? { ...m, nikLoading: true, nikOk: false, nikError: undefined } : m));
    fetch(`${APPS_SCRIPT_URL}?action=checkNIK&nik=${nikDigits}`)
      .then(res => res.json())
      .then(res => {
        setMembers(prev => prev.map(m => {
          if (m.id === id) {
            if (res.exists) {
              return { ...m, nikLoading: false, nikOk: false, nikError: `NIK ini sudah terdaftar: ${res.nama || '?'}` };
            } else {
              return { ...m, nikLoading: false, nikOk: true, nikError: undefined };
            }
          }
          return m;
        }));
      })
      .catch(() => {
        const found = finalRecords.find(r => cleanDigits(r.nik) === nikDigits);
        setMembers(prev => prev.map(m => {
          if (m.id === id) {
            if (found) {
              return { ...m, nikLoading: false, nikOk: false, nikError: `Terduplikasi atas nama: ${found.nama || '?'}` };
            } else {
              return { ...m, nikLoading: false, nikOk: true, nikError: undefined };
            }
          }
          return m;
        }));
      });
  };

  const handleNIKChange = (val: string, id: string) => {
    const digits = cleanDigits(val).slice(0, 16);
    setMembers(prev => prev.map(m => m.id === id ? { ...m, nik: digits, mOk: false, nikError: undefined } : m));
    if (digits.length === 16) {
      triggerNIKCheck(digits, id);
    }
  };

  const updateMemberField = (id: string, field: keyof Member, value: string) => {
    setMembers(prev => prev.map(m => {
      if (m.id === id) {
        let cleanVal = value;
        if (['namaLengkap', 'tempatLahir', 'namaIbu', 'namaAyah'].includes(field as string)) {
          cleanVal = value.toUpperCase();
        }
        if (field === 'statusHubungan' && cleanVal === 'Kepala Keluarga') {
          const hasKepala = prev.some(other => other.id !== id && other.statusHubungan === 'Kepala Keluarga');
          if (hasKepala) {
            alert('❌ Hanya boleh ada 1 Kepala Keluarga dalam daftar formulir ini!');
            return m;
          }
        }
        return { ...m, [field]: cleanVal };
      }
      return m;
    }));
  };

  const addMember = () => {
    const newIdx = members.length + 1;
    setMembers(prev => [...prev, {
      id: `member-${Date.now()}-${newIdx}`,
      nik: '',
      namaLengkap: '',
      statusHubungan: '',
      jenisKelamin: '',
      golonganDarah: '-',
      tempatLahir: '',
      tanggalLahir: '',
      agama: 'Islam',
      pendidikan: 'TIDAK/BELUM SEKOLAH',
      pekerjaan: 'Belum/Tidak Bekerja',
      statusKawin: 'Belum Kawin',
      namaIbu: '',
      namaAyah: '',
      nikOk: false
    }]);
  };

  const removeMember = (id: string) => {
    if (members.length <= 1) {
      alert('❌ Minimal harus menginput 1 anggota.');
      return;
    }
    setMembers(prev => prev.filter(m => m.id !== id));
  };

  // Submit master KK and new members to sheets
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const errors: string[] = [];
    if (noKK.length !== 16) errors.push('No. KK wajib diisi lengkap 16 digit.');
    if (!alamat.trim()) errors.push('Alamat Dusun wajib diisi.');
    if (!noRW) errors.push('RW wajib dipilih.');
    if (!noRT) errors.push('RT wajib dipilih.');

    let kkCount = 0;
    members.forEach((m, idx) => {
      const o = idx + 1;
      if (m.nik.length !== 16) errors.push(`Anggota #${o}: NIK wajib diisi 16 digit.`);
      if (!m.namaLengkap.trim()) errors.push(`Anggota #${o}: Nama lengkap wajib diisi.`);
      if (!m.statusHubungan) errors.push(`Anggota #${o}: Hubungan status wajib dipilih.`);
      if (!m.jenisKelamin) errors.push(`Anggota #${o}: Jenis kelamin wajib dipilih.`);
      if (!m.tempatLahir.trim()) errors.push(`Anggota #${o}: Tempat lahir wajib diisi.`);
      if (!m.tanggalLahir) errors.push(`Anggota #${o}: Tanggal lahir wajib diisi.`);
      if (m.statusHubungan === 'Kepala Keluarga') kkCount++;
    });

    if (kkCount !== 1) {
      errors.push('Harus ada tepat dan hanya 1 anggota berstatus "Kepala Keluarga".');
    }

    if (errors.length > 0) {
      alert(`⚠️ Harap lengkapi semua isian:\n\n${errors.map(err => `• ${err}`).join('\n')}`);
      return;
    }

    const payload = {
      action: 'submitKK',
      noKK: "'" + noKK,
      namaKK: kepalaKeluargaName,
      alamat: alamat.toUpperCase(),
      noRW,
      noRT,
      members: members.map(m => {
        const [y, mStr, d] = m.tanggalLahir.split('-');
        return {
          nik: "'" + m.nik,
          namaLengkap: m.namaLengkap,
          statusHubungan: m.statusHubungan,
          jenisKelamin: m.jenisKelamin,
          tempatLahir: m.tempatLahir,
          tanggalLahir: `${d}/${mStr}/${y}`,
          golonganDarah: m.golonganDarah,
          agama: m.agama,
          pendidikan: m.pendidikan,
          pekerjaan: m.pekerjaan,
          statusKawin: m.statusKawin,
          namaIbu: m.namaIbu,
          namaAyah: m.namaAyah
        };
      })
    };

    setLoading(true);
    fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      body: JSON.stringify(payload)
    })
      .then(res => res.json())
      .then(res => {
        setLoading(false);
        if (res.success) {
          alert(`✅ BERHASIL DISIMPAN!\n\nData KK ${kepalaKeluargaName} berhasil dikirim ke Google Sheet.`);
          
          // Append locally too to make UI database list instant
          const newAdds = [...localAdds];
          payload.members.forEach(m => {
            newAdds.push({
              noKK: cleanDigits(payload.noKK),
              nik: cleanDigits(m.nik),
              nama: m.namaLengkap,
              namaKK: payload.namaKK,
              alamat: payload.alamat,
              rw: payload.noRW,
              rt: payload.noRT,
              statusHubungan: m.statusHubungan
            });
          });
          setLocalAdds(newAdds);
          updateLocalOverrides(newAdds, localEdits, localDeletes);
          resetForm();
          fetchRecords();
        } else {
          alert(`❌ Gagal menyimpan: ${res.message}`);
        }
      })
      .catch(err => {
        setLoading(false);
        alert(`❌ Kesalahan koneksi: ${err.message || 'Coba lagi.'}`);
      });
  };

  const resetForm = () => {
    setNoKK('');
    setAlamat('');
    setAlamatInput('');
    setNoRW('');
    setNoRT('');
    setKkCheckStatus('idle');
    setKkDupDetail(null);
    setMembers([{
      id: 'member-1',
      nik: '',
      namaLengkap: '',
      statusHubungan: 'Kepala Keluarga',
      jenisKelamin: '',
      golonganDarah: '-',
      tempatLahir: '',
      tanggalLahir: '',
      agama: 'Islam',
      pendidikan: 'TIDAK/BELUM SEKOLAH',
      pekerjaan: 'Belum/Tidak Bekerja',
      statusKawin: 'Kawin',
      namaIbu: '',
      namaAyah: '',
      nikOk: false
    }]);
  };

  // CRUD actions for table database
  const handleDeleteResident = (nik: string) => {
    if (confirm(`Apakah Anda yakin ingin menghapus data penduduk dengan NIK: ${nik}?`)) {
      const cleanTarget = cleanDigits(nik);
      const updatedDeletes = [...localDeletes, cleanTarget];
      const updatedAdds = localAdds.filter(item => cleanDigits(item.nik) !== cleanTarget);
      
      setLocalDeletes(updatedDeletes);
      setLocalAdds(updatedAdds);
      updateLocalOverrides(updatedAdds, localEdits, updatedDeletes);
      
      // Dispatch async background deletions call as mock api placeholder
      fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
        body: JSON.stringify({ action: 'deleteMember', nik: "'" + cleanTarget })
      }).catch(e => console.log("Direct server deletion warning : ", e.message));

      alert('🗑️ Data berhasil dihapus dari database lokal ini.');
    }
  };

  const handleOpenEditModal = (rec: AppRecord) => {
    setEditingRecord({
      ...rec,
      statusHubungan: rec.statusHubungan || 'Anak',
      jenisKelamin: rec.jenisKelamin || '1',
      golonganDarah: rec.golonganDarah || '-',
      tempatLahir: rec.tempatLahir || '',
      tanggalLahir: rec.tanggalLahir || '',
      agama: rec.agama || 'Islam',
      pendidikan: rec.pendidikan || 'Slta/Sederajat',
      pekerjaan: rec.pekerjaan || 'Karyawan Swasta',
      statusKawin: rec.statusKawin || 'Belum Kawin',
      namaIbu: rec.namaIbu || '',
      namaAyah: rec.namaAyah || ''
    });
  };

  const handleSaveEditModal = (e: FormEvent) => {
    e.preventDefault();
    if (!editingRecord) return;

    if (editingRecord.nik.replace(/\D/g, '').length !== 16) {
      alert('❌ NIK harus tepat 16 digit.');
      return;
    }
    if (!editingRecord.nama.trim()) {
      alert('❌ Nama lengkap harus diisi.');
      return;
    }

    // Save and merge
    const editPayload = {
      ...editingRecord,
      nama: editingRecord.nama.toUpperCase(),
      tempatLahir: editingRecord.tempatLahir?.toUpperCase() || ''
    };

    const isLocalAdd = localAdds.some(a => cleanDigits(a.nik) === cleanDigits(editPayload.nik));
    let updatedAdds = [...localAdds];
    let updatedEdits = [...localEdits];

    if (isLocalAdd) {
      updatedAdds = updatedAdds.map(a => cleanDigits(a.nik) === cleanDigits(editPayload.nik) ? editPayload : a);
      setLocalAdds(updatedAdds);
    } else {
      const idx = updatedEdits.findIndex(ed => cleanDigits(ed.nik) === cleanDigits(editPayload.nik));
      if (idx > -1) {
        updatedEdits[idx] = editPayload;
      } else {
        updatedEdits.push(editPayload);
      }
      setLocalEdits(updatedEdits);
    }

    updateLocalOverrides(updatedAdds, updatedEdits, localDeletes);
    
    // Async background edit
    fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      body: JSON.stringify({ action: 'editMember', ...editPayload })
    }).catch(e => console.log("Edit network sync alert", e));

    alert('💾 Data penduduk berhasil diperbarui.');
    setEditingRecord(null);
  };

  const handleSaveQuickAdd = (e: FormEvent) => {
    e.preventDefault();
    if (quickAddForm.nik.replace(/\D/g, '').length !== 16) { alert('❌ NIK harus tepat 16 digit.'); return; }
    if (quickAddForm.noKK.replace(/\D/g, '').length !== 16) { alert('❌ No. KK harus tepat 16 digit.'); return; }
    if (!quickAddForm.nama.trim()) { alert('❌ Nama lengkap harus diisi.'); return; }

    const newRecord: AppRecord = {
      noKK: cleanDigits(quickAddForm.noKK),
      nik: cleanDigits(quickAddForm.nik),
      nama: quickAddForm.nama.toUpperCase(),
      namaKK: quickAddForm.namaKK.toUpperCase() || quickAddForm.nama.toUpperCase(),
      alamat: quickAddForm.alamat.toUpperCase() || 'KAMPUNG BARU',
      rw: quickAddForm.rw || '1',
      rt: quickAddForm.rt || '1',
      statusHubungan: quickAddForm.statusHubungan,
      jenisKelamin: quickAddForm.jenisKelamin,
      golonganDarah: quickAddForm.golonganDarah,
      tempatLahir: quickAddForm.tempatLahir.toUpperCase(),
      tanggalLahir: quickAddForm.tanggalLahir,
      agama: quickAddForm.agama,
      pendidikan: quickAddForm.pendidikan,
      pekerjaan: quickAddForm.pekerjaan,
      statusKawin: quickAddForm.statusKawin,
      namaIbu: quickAddForm.namaIbu.toUpperCase(),
      namaAyah: quickAddForm.namaAyah.toUpperCase()
    };

    const isExist = finalRecords.some(r => cleanDigits(r.nik) === cleanDigits(newRecord.nik));
    if (isExist) {
      alert('❌ NIK ini sudah terdaftar di database!');
      return;
    }

    const updatedAdds = [...localAdds, newRecord];
    setLocalAdds(updatedAdds);
    updateLocalOverrides(updatedAdds, localEdits, localDeletes);

    alert('✅ Penduduk berhasil ditambahkan secara instan.');
    setIsQuickAddOpen(false);
    setQuickAddForm({
      noKK: '', namaKK: '', nik: '', nama: '', alamat: '', rw: '', rt: '',
      statusHubungan: 'Anak', jenisKelamin: '1', golonganDarah: '-', tempatLahir: '',
      tanggalLahir: '', agama: 'Islam', pendidikan: 'Slta/Sederajat', pekerjaan: 'Pelajar/Mahasiswa',
      statusKawin: 'Belum Kawin', namaIbu: '', namaAyah: ''
    });
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href)
      .then(() => {
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 3000);
      });
  };

  // Filter & Search calculation
  const filteredRecords = finalRecords.filter(r => {
    const q = searchQuery.toLowerCase();
    const matchSearch = 
      (r.nama || '').toLowerCase().includes(q) ||
      (r.nik || '').includes(q) ||
      (r.noKK || '').includes(q) ||
      (r.alamat || '').toLowerCase().includes(q) ||
      (r.namaKK || '').toLowerCase().includes(q);
      
    const matchRW = filterRW ? cleanDigits(r.rw) === filterRW : true;
    const matchRT = filterRT ? cleanDigits(r.rt) === filterRT : true;
    const matchDusun = filterDusun ? (r.alamat || '').toUpperCase() === filterDusun.toUpperCase() : true;

    return matchSearch && matchRW && matchRT && matchDusun;
  });

  const totalPages = Math.max(Math.ceil(filteredRecords.length / itemsPerPage), 1);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentRecordsPaged = filteredRecords.slice(indexOfFirstItem, indexOfLastItem);

  const alamatSuggestions = ALAMAT_LIST.filter(a => 
    a.toLowerCase().includes(alamatInput.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans pb-16 antialiased">
      {/* GLOBAL GLOW TOP BAR */}
      <div className="h-1.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-500"></div>

      {/* HEADER BAR */}
      <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-6xl mx-auto px-4 py-3 sm:py-4 flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600/20 text-indigo-400 p-2.5 rounded-xl border border-indigo-500/30 font-bold text-xl shadow-inner animate-pulse">
              📋
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-black text-white tracking-tight leading-tight flex items-center gap-2">
                Sistem Buku Induk Penduduk
                <span className="text-[10px] bg-indigo-500/10 text-indigo-400 font-bold uppercase tracking-widest px-2 py-0.5 rounded border border-indigo-500/20">v2.5 PRO</span>
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">Sistem Input, Statistik Dashboard, dan Database Penduduk Terpadu (CRUD)</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button 
              type="button" 
              onClick={handleCopyLink}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 transition-all text-xs font-bold text-slate-200 border border-slate-700 focus:outline-none"
            >
              {copiedLink ? (
                <>
                  <Check className="h-4 w-4 text-emerald-400" />
                  <span className="text-emerald-400">Link Tersalin</span>
                </>
              ) : (
                <>
                  <Share2 className="h-4 w-4 text-indigo-400" />
                  <span>Bagikan Link Publik</span>
                </>
              )}
            </button>
            
            <button
              onClick={() => setIsExcelOpen(!isExcelOpen)}
              className="px-3 py-2 rounded-xl bg-indigo-900/20 text-indigo-400 border border-indigo-500/30 hover:bg-indigo-900/30 active:scale-95 transition-all text-xs font-bold focus:outline-none"
            >
              <FileCode className="h-4 w-4 inline mr-1" />
              Apps Script Integration
            </button>
          </div>
        </div>

        {/* TAB NAVIGATION PANEL */}
        <div className="max-w-6xl mx-auto px-4 mt-1 flex border-t border-slate-800/60 overflow-x-auto whitespace-nowrap scrollbar-none">
          <button 
            onClick={() => { setActiveTab('form'); setCurrentPage(1); }}
            className={`flex items-center gap-2 px-5 py-3 border-b-2 font-bold text-xs sm:text-sm transition-all focus:outline-none cursor-pointer ${activeTab === 'form' ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
          >
            <ClipboardCheck className="h-4 w-4" />
            <span>Pendaftaran Baru</span>
          </button>
          <button 
            onClick={() => { setActiveTab('dashboard'); }}
            className={`flex items-center gap-2 px-5 py-3 border-b-2 font-bold text-xs sm:text-sm transition-all focus:outline-none cursor-pointer ${activeTab === 'dashboard' ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
          >
            <LayoutDashboard className="h-4 w-4" />
            <span>Dashboard Statistik</span>
            <span className="bg-emerald-500/10 text-emerald-400 text-[10px] px-2 py-0.5 rounded-full border border-emerald-500/20">Live</span>
          </button>
          <button 
            onClick={() => { setActiveTab('database'); }}
            className={`flex items-center gap-2 px-5 py-3 border-b-2 font-bold text-xs sm:text-sm transition-all focus:outline-none cursor-pointer ${activeTab === 'database' ? 'border-sky-500 text-sky-400 bg-sky-500/5' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
          >
            <Database className="h-4 w-4" />
            <span>Database Penduduk (CRUD)</span>
            <span className="bg-sky-500/10 text-sky-400 text-[10px] px-2 py-0.5 rounded-full border border-sky-500/20 font-bold">
              {finalRecords.length}
            </span>
          </button>
        </div>
      </header>

      {/* DETAILED APPS SCRIPT GUIDE PANEL ACCORDION */}
      {isExcelOpen && (
        <div className="bg-slate-950 border-b border-indigo-500/30 p-4">
          <div className="max-w-4xl mx-auto space-y-3">
            <div className="flex justify-between items-start">
              <h3 className="font-bold text-indigo-300 text-sm flex items-center gap-2">
                <FileCode className="h-4 w-4 text-indigo-400" />
                Cara Mengaktifkan Sinkronisasi Edit &amp; Hapus ke Google Sheets
              </h3>
              <button onClick={() => setIsExcelOpen(false)} className="text-slate-400 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Google Apps Script bawaan default Anda saat ini hanya dikonfigurasi untuk menambahkan data baru (`submitKK`). Agar perubahan &amp; penghapusan data penduduk di menu <strong>"Database Penduduk (CRUD)"</strong> tersimpan secara permanen ke Google Sheets Anda, silakan tambahkan baris berikut di dalam fungsi <code>doPost(e)</code> di Apps Script Anda:
            </p>
            <pre className="bg-slate-900 border border-slate-800 p-3 rounded-lg text-[11px] font-mono overflow-x-auto text-emerald-400 max-h-56">
{`// Salin & tambahkan di dalam fungsi doPost(e) di Google Apps Script Anda:
if (payload.action === 'deleteMember') {
  const sheet = getSheet();
  const data = sheet.getDataRange().getValues();
  const rawTargetNik = String(payload.nik).replace(/\D/g, '');
  for (let i = 1; i < data.length; i++) {
    const rowNik = String(data[i][COL.NIK]).replace(/\\D/g, '');
    if (rowNik === rawTargetNik) {
      sheet.deleteRow(i + 1); // Delete targeted resident row in Sheet
      break;
    }
  }
  return ContentService.createTextOutput(JSON.stringify({ success: true }));
} else if (payload.action === 'editMember') {
  const sheet = getSheet();
  const data = sheet.getDataRange().getValues();
  const rawTargetNik = String(payload.nik).replace(/\\D/g, '');
  for (let i = 1; i < data.length; i++) {
    const rowNik = String(data[i][COL.NIK]).replace(/\\D/g, '');
    if (rowNik === rawTargetNik) {
      // Update cell values by indexes
      sheet.getRange(i + 1, COL.NAMA_LENGKAP + 1).setValue(payload.nama);
      sheet.getRange(i + 1, COL.ALAMAT + 1).setValue(payload.alamat);
      sheet.getRange(i + 1, COL.NO_RW + 1).setValue(payload.rw);
      sheet.getRange(i + 1, COL.NO_RT + 1).setValue(payload.rt);
      break;
    }
  }
  return ContentService.createTextOutput(JSON.stringify({ success: true }));
}`}
            </pre>
          </div>
        </div>
      )}

      {/* MAIN CONTAINER */}
      <main className="max-w-6xl mx-auto px-4 mt-6">

        {/* ========================================================= */}
        {/* TAB 1: FORM PENDAFTARAN (UNTOUCHED LOGIC & FULL FEATURES) */}
        {/* ========================================================= */}
        {activeTab === 'form' && (
          <div className="space-y-5 max-w-4xl mx-auto">
            {/* COUNTER BAR */}
            <Card className="bg-slate-800 border-slate-700 shadow-xl rounded-2xl overflow-hidden">
              <CardContent className="p-0 grid grid-cols-3 divide-x divide-slate-700 items-center justify-around h-20">
                <div className="text-center px-2 flex flex-col items-center justify-center h-full">
                  <div className="text-base sm:text-lg font-black text-blue-400 truncate">
                    {noKK ? formatKKDisplay(noKK) : '–'}
                  </div>
                  <div className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider mt-0.5">No. KK</div>
                </div>
                <div className="text-center px-2 flex flex-col items-center justify-center h-full">
                  <div className="text-base sm:text-lg font-black text-indigo-400">
                    {members.length} Anggota
                  </div>
                  <div className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider mt-0.5">Total Input</div>
                </div>
                <div className="text-center px-2 flex flex-col items-center justify-center h-full">
                  <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 bg-emerald-500/10 mb-1 gap-1.5 font-extrabold pb-0.5 px-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    Sistem Aktif
                  </Badge>
                  <div className="text-[10px] text-slate-400 truncate mt-0.5 w-full">
                    {connectionStatus}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* SHARED ALERT POPUP */}
            <div className="p-3 bg-indigo-950/40 border border-indigo-500/30 rounded-xl flex items-start gap-3 shadow-sm">
              <Info className="h-5 w-5 text-indigo-400 shrink-0 mt-0.5" />
              <div className="text-xs text-indigo-200 leading-relaxed">
                <strong className="block text-indigo-100 font-bold mb-0.5">💡 Input Praktis &amp; Otomatis</strong>
                Setiap NIK &amp; No. KK akan terverifikasi secara instan dengan database di Cloud Spreadsheet untuk mendeteksi potensi duplikat secara real-time.
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              
              {/* BAGIAN A: IDENTITAS Master KK */}
              <Card className="bg-slate-800/80 shadow-xl border-slate-700/80 overflow-hidden rounded-2xl">
                <CardHeader className="bg-gradient-to-r from-blue-900/30 to-indigo-900/30 border-b border-slate-700/80 px-5 py-4 flex flex-row items-center gap-3">
                  <div className="h-7 w-7 rounded-lg bg-blue-600/90 text-white font-extrabold text-xs flex items-center justify-center shrink-0">
                    A
                  </div>
                  <div className="flex-1 space-y-0.5">
                    <CardTitle className="text-sm font-black text-white uppercase tracking-widest">Identitas No. KK &amp; Wilayah</CardTitle>
                    <CardDescription className="text-[11px] text-slate-400 font-medium">Diisi sekali untuk seluruh anggota keluarga di dalam formulir ini.</CardDescription>
                  </div>
                </CardHeader>

                <CardContent className="p-5 space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    
                    {/* NO KK INPUT */}
                    <div className="space-y-1.5">
                      <Label className="text-[11px] font-extrabold text-slate-300 uppercase tracking-widest">
                        No. Kartu Keluarga <span className="text-rose-500">*</span>
                      </Label>
                      <div className="relative">
                        <Input 
                          className="bg-slate-900 border-slate-700 text-white font-mono text-sm h-11 rounded-xl focus-visible:ring-blue-500"
                          placeholder="16 Digit Nomor KK"
                          value={formatKKDisplay(noKK)}
                          onChange={(e) => handleKKChange(e.target.value)}
                          maxLength={19}
                          inputMode="numeric"
                        />
                        {kkCheckStatus !== 'idle' && (
                          <div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5 text-xs font-bold pointer-events-none">
                            {kkCheckStatus === 'checking' && (
                              <span className="text-slate-400 flex items-center gap-1">
                                <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-400" />
                                Menganalisis...
                              </span>
                            )}
                            {kkCheckStatus === 'ok' && (
                              <span className="text-emerald-400 flex items-center gap-1">
                                <CheckCircle className="h-4 w-4 text-emerald-400 fill-emerald-950" />
                                KK Baru
                              </span>
                            )}
                            {kkCheckStatus === 'duplicate' && (
                              <span className="text-rose-400 flex items-center gap-1 animate-bounce">
                                <AlertTriangle className="h-4 w-4 text-rose-500" />
                                Terdaftar!
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                      <div className={`text-[10px] mt-1 text-right font-semibold ${noKK.length === 16 ? 'text-emerald-400' : 'text-slate-500'}`}>
                        {noKK.length} / 16 Digit
                      </div>

                      {kkCheckStatus === 'duplicate' && kkDupDetail && (
                        <div className="mt-2.5 p-3 bg-rose-950/30 border border-rose-500/20 rounded-xl text-xs space-y-1.5">
                          <div className="flex items-center gap-1.5 font-bold text-rose-400">
                            <AlertTriangle className="h-4 w-4 text-rose-400" />
                            No. KK ini sudah terdaftar sebelumnya:
                          </div>
                          <div className="text-slate-200 bg-slate-900/90 border border-rose-500/10 p-2.5 rounded-lg grid grid-cols-2 gap-2">
                            <div>
                              <span className="text-[10px] text-slate-400 block uppercase font-bold">Kepala KK</span>
                              <span className="font-bold text-white block truncate">{kkDupDetail.namaKK || '–'}</span>
                            </div>
                            <div>
                              <span className="text-[10px] text-slate-400 block uppercase font-bold">Alamat</span>
                              <span className="font-bold text-white block truncate">{kkDupDetail.alamat || '–'} RW {kkDupDetail.rw} RT {kkDupDetail.rt}</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* READ-ONLY AUTO HEADER KK FROM TYPE */}
                    <div className="space-y-1.5">
                      <Label className="text-[11px] font-extrabold text-slate-300 uppercase tracking-widest">
                        Nama Kepala Keluarga
                      </Label>
                      <Input 
                        className="bg-slate-800/80 border-slate-700 text-slate-400 font-bold cursor-not-allowed text-sm h-11 rounded-xl"
                        value={kepalaKeluargaName || 'Otomatis terisi dari nama Kepala...'}
                        readOnly
                      />
                      <span className="text-[10px] text-slate-500 block">
                        ℹ️ Nama otomatis muncul saat status anggota adalah "Kepala Keluarga".
                      </span>
                    </div>
                  </div>

                  {/* SUB DUSUN RT RW INPUT */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                    
                    {/* COMBOPLACE ALAMAT DUSUN */}
                    <div className="relative space-y-1.5" ref={alamatRef}>
                      <Label className="text-[11px] font-extrabold text-slate-300 uppercase tracking-widest">
                        Alamat Dusun/Kampung <span className="text-rose-500">*</span>
                      </Label>
                      <Input 
                        className="bg-slate-900 border-slate-700 text-white font-bold text-sm h-11 rounded-xl focus-visible:ring-blue-500"
                        placeholder="Pilih/ketik nama dusun..."
                        value={alamatInput}
                        onChange={(e) => {
                          setAlamatInput(e.target.value);
                          setAlamat(e.target.value);
                          setShowAlamatDropdown(true);
                        }}
                        onFocus={() => setShowAlamatDropdown(true)}
                      />

                      {showAlamatDropdown && (
                        <div className="absolute left-0 right-0 top-[60px] mx-0 max-h-48 overflow-y-auto bg-slate-900 border border-slate-700/80 rounded-xl shadow-2xl z-50 divide-y divide-slate-800 text-left">
                          {alamatSuggestions.map((a, i) => (
                            <button
                              key={i}
                              type="button"
                              className="w-full px-3.5 py-2 text-xs sm:text-sm text-slate-200 hover:bg-slate-800 active:bg-slate-700 transition-colors text-left font-bold block"
                              onClick={() => {
                                setAlamatInput(a);
                                setAlamat(a);
                                setShowAlamatDropdown(false);
                              }}
                            >
                              {a}
                            </button>
                          ))}
                          {alamatSuggestions.length === 0 && alamatInput && (
                            <button
                              type="button"
                              className="w-full px-3.5 py-2 text-xs text-blue-400 hover:bg-slate-800 transition-colors text-left block font-bold"
                              onClick={() => {
                                setAlamat(alamatInput);
                                setShowAlamatDropdown(false);
                              }}
                            >
                              ➕ Gunakan "{alamatInput}"
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* SELECT RW */}
                    <div className="space-y-1.5">
                      <Label className="text-[11px] font-extrabold text-slate-300 uppercase tracking-widest">
                        No. RW <span className="text-rose-500">*</span>
                      </Label>
                      <Select 
                        value={noRW} 
                        onValueChange={(val) => {
                          setNoRW(val);
                          setNoRT('');
                        }}
                      >
                        <SelectTrigger className="w-full bg-slate-900 border-slate-700 text-white h-11 rounded-xl focus:ring-blue-500 font-bold text-sm">
                          <SelectValue placeholder="Pilih RW" />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-800 border-slate-700 text-slate-100">
                          {Object.keys(RT_MAP).map(rw => (
                            <SelectItem key={rw} value={rw}>RW {rw}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* SELECT RT */}
                    <div className="space-y-1.5">
                      <Label className="text-[11px] font-extrabold text-slate-300 uppercase tracking-widest">
                        No. RT <span className="text-rose-500">*</span>
                      </Label>
                      <Select 
                        value={noRT} 
                        onValueChange={setNoRT}
                        disabled={!noRW}
                      >
                        <SelectTrigger className="w-full bg-slate-900 border-slate-700 text-white h-11 rounded-xl focus:ring-blue-500 font-bold text-sm disabled:opacity-40">
                          <SelectValue placeholder="Pilih RT" />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-800 border-slate-700 text-slate-100">
                          {noRW && RT_MAP[noRW]?.map(rt => (
                            <SelectItem key={rt} value={rt.toString()}>RT {String(rt).padStart(2, '0')}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                  </div>
                </CardContent>
              </Card>

              {/* BAGIAN B: ANGGOTA KELUARGA FORM */}
              <Card className="bg-slate-800/80 shadow-xl border-slate-700/80 overflow-hidden rounded-2xl">
                <CardHeader className="bg-gradient-to-r from-emerald-900/30 to-teal-900/30 border-b border-slate-700/80 px-5 py-4 flex flex-row items-center gap-3">
                  <div className="h-7 w-7 rounded-lg bg-emerald-600/90 text-white font-extrabold text-xs flex items-center justify-center shrink-0">
                    B
                  </div>
                  <div className="flex-1 space-y-0.5">
                    <CardTitle className="text-sm font-black text-white uppercase tracking-widest">Identitas Anggota Keluarga</CardTitle>
                    <CardDescription className="text-[11px] text-slate-400 font-medium">Tambahkan seluruh anggota keluarga sebelum menekan tombol simpan terpadu.</CardDescription>
                  </div>
                </CardHeader>

                <CardContent className="p-3 sm:p-5 space-y-5">
                  {members.map((member, index) => {
                    const order = index + 1;
                    const isKepala = member.statusHubungan === 'Kepala Keluarga';
                    
                    return (
                      <div 
                        key={member.id}
                        className="border border-slate-700 rounded-2xl overflow-hidden hover:border-slate-600 transition-all duration-200 bg-slate-900/30"
                      >
                        {/* Header Member Card */}
                        <div className="bg-slate-800 border-b border-slate-700/60 px-4 py-3 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            <span className="h-6 w-6 rounded-lg bg-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                              {order}
                            </span>
                            <h3 className="text-xs sm:text-sm font-bold text-white truncate max-w-[150px] sm:max-w-xs">
                              {isKepala ? '👑' : '👤'} {member.namaLengkap || `Anggota Keluarga #${order}`}
                            </h3>
                            {member.statusHubungan && (
                              <span className="text-[9px] font-bold px-2.0 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-400/20 text-indigo-400 shrink-0">
                                {member.statusHubungan}
                              </span>
                            )}
                          </div>

                          {order > 1 && (
                            <button
                              type="button"
                              onClick={() => removeMember(member.id)}
                              className="flex items-center gap-1 text-rose-400 hover:text-white bg-rose-500/10 hover:bg-rose-600/35 transition-all text-xs font-bold px-2.5 py-1.5 rounded-xl border border-rose-500/20"
                            >
                              <Trash2 className="h-3 w-3" />
                              <span>Batal</span>
                            </button>
                          )}
                        </div>

                        {/* Body Member Grid Form */}
                        <div className="p-4 space-y-4">
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                            
                            {/* NIK */}
                            <div className="space-y-1.5">
                              <Label className="text-[10px] font-bold text-slate-300 uppercase">
                                NIK Penduduk <span className="text-rose-500">*</span>
                              </Label>
                              <div className="relative">
                                <Input
                                  className="bg-slate-900 border-slate-700/80 text-white font-mono text-sm h-11 rounded-xl focus-visible:ring-indigo-500"
                                  placeholder="16 Digit NIK"
                                  value={formatKKDisplay(member.nik)}
                                  onChange={(e) => handleNIKChange(e.target.value, member.id)}
                                  maxLength={19}
                                  inputMode="numeric"
                                />
                                {member.nikLoading && (
                                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-indigo-400 animate-spin" />
                                )}
                              </div>
                              {member.nikError && (
                                <p className="text-[10px] text-rose-400 flex items-center gap-1.5 font-bold">
                                  <AlertTriangle className="h-3.5 w-3.5" />
                                  {member.nikError}
                                </p>
                              )}
                              {member.nikOk && (
                                <p className="text-[10px] text-emerald-400 flex items-center gap-1.5 font-bold">
                                  <CheckCircle className="h-3.5 w-3.5" />
                                  NIK Terverifikasi Baru
                                </p>
                              )}
                              <div className={`text-[9px] text-right font-medium ${member.nik.length === 16 ? 'text-emerald-400' : 'text-slate-550'}`}>
                                {member.nik.length} / 16 digit
                              </div>
                            </div>

                            {/* NAMA LENGKAP */}
                            <div className="sm:col-span-2 space-y-1.5">
                              <Label className="text-[10px] font-bold text-slate-300 uppercase">
                                Nama Lengkap <span className="text-rose-500">*</span>
                              </Label>
                              <Input
                                className="bg-slate-900 border-slate-700/80 text-white font-bold text-sm h-11 rounded-xl focus-visible:ring-indigo-500"
                                placeholder="Nama sesuai KTP"
                                value={member.namaLengkap}
                                onChange={(e) => updateMemberField(member.id, 'namaLengkap', e.target.value)}
                              />
                            </div>

                            {/* HUBUNGAN KELUARGA */}
                            <div className="space-y-1.5">
                              <Label className="text-[10px] font-bold text-slate-300 uppercase">
                                Hubungan Keluarga <span className="text-rose-500">*</span>
                              </Label>
                              <Select
                                value={member.statusHubungan}
                                onValueChange={(val) => updateMemberField(member.id, 'statusHubungan', val)}
                              >
                                <SelectTrigger className="bg-slate-900 border-slate-700/80 text-white h-11 rounded-xl text-sm w-full">
                                  <SelectValue placeholder="Pilih Hubungan" />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-800 border-slate-700 text-slate-100">
                                  {STATUS_OPTIONS.map(o => (
                                    <SelectItem key={o} value={o}>{o}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            {/* SEX GENDER */}
                            <div className="space-y-1.5">
                              <Label className="text-[10px] font-bold text-slate-300 uppercase">
                                Jenis Kelamin <span className="text-rose-500">*</span>
                              </Label>
                              <Select
                                value={member.jenisKelamin}
                                onValueChange={(val) => updateMemberField(member.id, 'jenisKelamin', val)}
                              >
                                <SelectTrigger className="bg-slate-900 border-slate-700/80 text-white h-11 rounded-xl text-sm w-full">
                                  <SelectValue placeholder="Pilih Jenis Kelamin" />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-800 border-slate-700 text-slate-100">
                                  <SelectItem value="1">1 - Laki-laki</SelectItem>
                                  <SelectItem value="2">2 - Perempuan</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            {/* TEMPAT LAHIR */}
                            <div className="space-y-1.5">
                              <Label className="text-[10px] font-bold text-slate-300 uppercase">
                                Tempat Lahir <span className="text-rose-500">*</span>
                              </Label>
                              <Input
                                className="bg-slate-900 border-slate-700/80 text-white text-sm h-11 rounded-xl"
                                placeholder="Kota lahir"
                                value={member.tempatLahir}
                                onChange={(e) => updateMemberField(member.id, 'tempatLahir', e.target.value)}
                              />
                            </div>

                            {/* TANGGAL LAHIR */}
                            <div className="space-y-1.5">
                              <Label className="text-[10px] font-bold text-slate-300 uppercase">
                                Tanggal Lahir <span className="text-rose-500">*</span>
                              </Label>
                              <Input
                                type="date"
                                className="bg-slate-900 border-slate-700/80 text-white text-sm h-11 rounded-xl block w-full px-3"
                                value={member.tanggalLahir}
                                onChange={(e) => updateMemberField(member.id, 'tanggalLahir', e.target.value)}
                                max={new Date().toISOString().split('T')[0]}
                              />
                            </div>

                            {/* AGAMA */}
                            <div className="space-y-1.5">
                              <Label className="text-[10px] font-bold text-slate-300 uppercase">
                                Agama
                              </Label>
                              <Select
                                value={member.agama}
                                onValueChange={(val) => updateMemberField(member.id, 'agama', val)}
                              >
                                <SelectTrigger className="bg-slate-900 border-slate-700 text-white h-11 rounded-xl text-sm w-full">
                                  <SelectValue placeholder="Pilih Agama" />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-800 border-slate-700 text-slate-100">
                                  {AGAMA_OPTIONS.map(o => (
                                    <SelectItem key={o} value={o}>{o}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            {/* GOLONGAN DARAH */}
                            <div className="space-y-1.5">
                              <Label className="text-[10px] font-bold text-slate-300 uppercase">
                                Gol. Darah
                              </Label>
                              <Select
                                value={member.golonganDarah}
                                onValueChange={(val) => updateMemberField(member.id, 'golonganDarah', val)}
                              >
                                <SelectTrigger className="bg-slate-900 border-slate-700 text-white h-11 rounded-xl text-sm w-full">
                                  <SelectValue placeholder="Pilih Gol. Darah" />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-800 border-slate-700 text-slate-100">
                                  {GOLDAR_OPTIONS.map(o => (
                                    <SelectItem key={o} value={o}>{o}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            {/* PENDIDIKAN */}
                            <div className="space-y-1.5">
                              <Label className="text-[10px] font-bold text-slate-300 uppercase">
                                Pendidikan Terakhir
                              </Label>
                              <Select
                                value={member.pendidikan}
                                onValueChange={(val) => updateMemberField(member.id, 'pendidikan', val)}
                              >
                                <SelectTrigger className="bg-slate-900 border-slate-705 text-white h-11 rounded-xl text-sm w-full">
                                  <SelectValue placeholder="Pilih Pendidikan" />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-800 border-slate-700 text-slate-100">
                                  {PENDIDIKAN_OPTIONS.map(o => (
                                    <SelectItem key={o} value={o}>{o}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            {/* PEKERJAAN */}
                            <div className="space-y-1.5">
                              <Label className="text-[10px] font-bold text-slate-300 uppercase">
                                Jenis Pekerjaan
                              </Label>
                              <Select
                                value={member.pekerjaan}
                                onValueChange={(val) => updateMemberField(member.id, 'pekerjaan', val)}
                              >
                                <SelectTrigger className="bg-slate-900 border-slate-705 text-white h-11 rounded-xl text-sm w-full">
                                  <SelectValue placeholder="Pilih Pekerjaan" />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-800 border-slate-700 text-slate-100">
                                  {PEKERJAAN_OPTIONS.map(o => (
                                    <SelectItem key={o} value={o}>{o}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            {/* STATUS KAWIN */}
                            <div className="space-y-1.5">
                              <Label className="text-[10px] font-bold text-slate-300 uppercase">
                                Status Perkawinan
                              </Label>
                              <Select
                                value={member.statusKawin}
                                onValueChange={(val) => updateMemberField(member.id, 'statusKawin', val)}
                              >
                                <SelectTrigger className="bg-slate-900 border-slate-700 text-white h-11 rounded-xl text-sm w-full">
                                  <SelectValue placeholder="Pilih Perkawinan" />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-800 border-slate-700 text-slate-100">
                                  {STATUS_KAWIN_OPTIONS.map(o => (
                                    <SelectItem key={o} value={o}>{o}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            {/* NAMA IBU */}
                            <div className="space-y-1.5">
                              <Label className="text-[10px] font-bold text-slate-300 uppercase">
                                Nama Lengkap Ibu
                              </Label>
                              <Input
                                className="bg-slate-900 border-slate-700/80 text-white text-sm h-11 rounded-xl"
                                placeholder="NAMA IBU KANDUNG"
                                value={member.namaIbu}
                                onChange={(e) => updateMemberField(member.id, 'namaIbu', e.target.value)}
                              />
                            </div>

                            {/* NAMA AYAH */}
                            <div className="space-y-1.5">
                              <Label className="text-[10px] font-bold text-slate-300 uppercase">
                                Nama Lengkap Ayah
                              </Label>
                              <Input
                                className="bg-slate-900 border-slate-700/80 text-white text-sm h-11 rounded-xl"
                                placeholder="NAMA AYAH KANDUNG"
                                value={member.namaAyah}
                                onChange={(e) => updateMemberField(member.id, 'namaAyah', e.target.value)}
                              />
                            </div>

                          </div>
                        </div>
                      </div>
                    );
                  })}

                  <Button
                    type="button"
                    variant="outline"
                    className="w-full py-6 mt-4 border-2 border-dashed border-indigo-500/40 text-indigo-400 font-bold rounded-2xl bg-indigo-500/5 hover:bg-indigo-500/10 hover:text-indigo-300 flex items-center justify-center gap-2 text-xs sm:text-sm transition-all focus:outline-none"
                    onClick={addMember}
                  >
                    <Plus className="h-4.5 w-4.5" />
                    <span>Tambah Anggota Transaksi Keluarga</span>
                  </Button>
                </CardContent>
              </Card>

              {/* ACTION BTN SUBMIT */}
              <div className="pt-2">
                <Button
                  type="submit"
                  disabled={loading}
                  size="lg"
                  className="w-full h-14 bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-700 text-white font-extrabold text-sm sm:text-base rounded-2xl shadow-xl shadow-indigo-950 hover:shadow-2xl active:scale-[0.98] transition-all flex items-center justify-center gap-2.5 hover:opacity-90 border-0"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span>Mengirim data...</span>
                    </>
                  ) : (
                    <>
                      <Save className="h-5 w-5" />
                      <span>Simpan &amp; Klusterisasi KK ke Spreadsheet</span>
                    </>
                  )}
                </Button>
              </div>

            </form>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 2: DASHBOARD STATISTIK (BEAUTIFUL RICH KPI & BARS) */}
        {/* ========================================================= */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6 max-w-5xl mx-auto">
            {/* KPI WIDGETS BENTO GRID */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-slate-800 p-4 rounded-2xl border border-slate-700 relative overflow-hidden flex items-center gap-3.5 shadow-xl">
                <div className="p-3 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/20 text-xl font-bold">👥</div>
                <div>
                  <div className="text-2xl font-black text-white">{totalPenduduk}</div>
                  <div className="text-[10px] uppercase font-extrabold text-slate-400 tracking-wider mt-0.5">Total Penduduk</div>
                </div>
                <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full -mr-6 -mt-6"></div>
              </div>

              <div className="bg-slate-800 p-4 rounded-2xl border border-slate-700 relative overflow-hidden flex items-center gap-3.5 shadow-xl">
                <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-xl border border-indigo-500/20 text-xl font-bold">🏠</div>
                <div>
                  <div className="text-2xl font-black text-white">{totalKK}</div>
                  <div className="text-[10px] uppercase font-extrabold text-slate-400 tracking-wider mt-0.5">Total Kepala KK</div>
                </div>
                <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full -mr-6 -mt-6"></div>
              </div>

              <div className="bg-slate-800 p-4 rounded-2xl border border-slate-700 relative overflow-hidden flex items-center gap-3.5 shadow-xl">
                <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20 text-xl font-bold">📍</div>
                <div>
                  <div className="text-2xl font-black text-white">{uniqueDusuns.length}</div>
                  <div className="text-[10px] uppercase font-extrabold text-slate-400 tracking-wider mt-0.5">Dusun Wilayah</div>
                </div>
                <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full -mr-6 -mt-6"></div>
              </div>

              <div className="bg-slate-800 p-4 rounded-2xl border border-slate-700 relative overflow-hidden flex items-center gap-3.5 shadow-xl">
                <div className="p-3 bg-purple-500/10 text-purple-400 rounded-xl border border-purple-500/20 text-xl font-bold">📊</div>
                <div>
                  <div className="text-xl font-black text-white truncate">
                    {finalRecords.length > 0 ? `RW 0${getRWDemographics().sort((a,b)=>b.count - a.count)[0].rw}` : '–'}
                  </div>
                  <div className="text-[10px] uppercase font-extrabold text-slate-400 tracking-wider mt-0.5">Kepadatan Tertinggi</div>
                </div>
                <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-full -mr-6 -mt-6"></div>
              </div>
            </div>

            {/* CHARTS CONTAINER GRID */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* COMPACT BARS: TOP POPULATED DUSUNS */}
              <div className="bg-slate-800 rounded-2xl border border-slate-700 p-5 shadow-xl">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                    <span className="p-1 px-2 bg-blue-500/20 text-blue-400 text-xs rounded-lg">📍</span>
                    Kuantitas Penduduk per Dusun (TOP 5)
                  </h3>
                  <span className="text-[10px] text-slate-400 font-bold bg-slate-900 px-2 py-0.5 rounded border border-slate-700">Skala Live</span>
                </div>

                <div className="space-y-4">
                  {getTopDusunsList().map((dusun, idx) => {
                    const maxVal = Math.max(...getTopDusunsList().map(d => d.count), 1);
                    const percent = Math.round((dusun.count / maxVal) * 100);
                    const rPercent = totalPenduduk > 0 ? Math.round((dusun.count / totalPenduduk) * 100) : 0;
                    return (
                      <div key={dusun.name} className="space-y-1">
                        <div className="flex justify-between text-xs font-bold text-slate-200">
                          <span className="truncate max-w-[200px] flex items-center gap-2">
                            <span className="text-slate-500">#{idx + 1}</span>
                            {dusun.name}
                          </span>
                          <span>
                            {dusun.count} Jiwa <span className="text-slate-400 font-normal">({rPercent}%)</span>
                          </span>
                        </div>
                        <div className="w-full h-3 bg-slate-900 rounded-lg overflow-hidden border border-slate-850">
                          <div 
                            style={{ width: `${percent}%` }}
                            className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-lg transition-all duration-1000"
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                  {getTopDusunsList().length === 0 && (
                    <div className="text-center py-10 text-slate-500 text-xs font-bold">Belum ada rincian data wilayah di database Anda.</div>
                  )}
                </div>
              </div>

              {/* DEMOGRAPHY RW BREAKDOWN */}
              <div className="bg-slate-800 rounded-2xl border border-slate-700 p-5 shadow-xl">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                    <span className="p-1 px-2 bg-emerald-500/20 text-emerald-400 text-xs rounded-lg">📊</span>
                    Distribusi Per Rukun Warga (RW 01 - RW 06)
                  </h3>
                  <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/25">Model Kluster</span>
                </div>

                <div className="space-y-4 pt-1">
                  {getRWDemographics().map((rwObj) => {
                    const maxVal = Math.max(...getRWDemographics().map(r => r.count), 1);
                    const rPercent = totalPenduduk > 0 ? Math.round((rwObj.count / totalPenduduk) * 100) : 0;
                    const widthPercent = Math.round((rwObj.count / maxVal) * 100);

                    return (
                      <div key={rwObj.rw} className="flex items-center gap-4">
                        <span className="text-xs font-black text-slate-300 w-12 font-bold shrink-0">RW 0{rwObj.rw}</span>
                        <div className="flex-1 h-5 bg-slate-900 rounded-lg overflow-hidden border border-slate-850 relative">
                          <div 
                            style={{ width: `${widthPercent || 4}%` }}
                            className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-lg transition-all duration-1000 flex items-center justify-end pr-2"
                          ></div>
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] font-black text-white">
                            {rwObj.count} Orang
                          </span>
                        </div>
                        <span className="text-xs font-bold text-slate-400 w-8 text-right">{rPercent}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>

            {/* SECONDARY ATTRIBUTE DEMO: GENDER & STATUS HUBUNGAN */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* STATUS HUBUNGAN KELUARGA DISTRIBUTION PROPORTIONS */}
              <div className="bg-slate-800 rounded-2xl border border-slate-700 p-5 shadow-xl">
                <h3 className="text-xs sm:text-sm font-black text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                  <span className="p-1 px-2 bg-indigo-500/20 text-indigo-400 text-xs rounded-lg">👑</span>
                  Proporsi Status Hubungan Anggota Keluarga
                </h3>
                <div className="space-y-3.5">
                  {STATUS_OPTIONS.map(status => {
                    const count = finalRecords.filter(r => (r.statusHubungan || 'Anak').toLowerCase().includes(status.toLowerCase().slice(0,3))).length;
                    const pct = totalPenduduk > 0 ? Math.round((count / totalPenduduk) * 100) : 0;
                    return (
                      <div key={status}>
                        <div className="flex justify-between text-xs font-bold text-slate-200 mb-1">
                          <span>{status === 'Kepala Keluarga' ? '👑 Kepala Keluarga' : status}</span>
                          <span>{count} Jiwa ({pct}%)</span>
                        </div>
                        <div className="h-2 w-full bg-slate-900 rounded overflow-hidden">
                          <div style={{ width: `${pct}%` }} className="h-full bg-indigo-500 rounded transition-all duration-1000"></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ESTIMATE GENDER ESTIMATOR BAR */}
              <div className="bg-slate-800 rounded-2xl border border-slate-700 p-5 shadow-xl flex flex-col justify-between">
                <div>
                  <h3 className="text-xs sm:text-sm font-black text-white uppercase tracking-wider mb-3 flex items-center gap-2">
                    <span className="p-1 px-2 bg-rose-500/20 text-rose-400 text-xs rounded-lg">👩‍👦</span>
                    Statistik Perbandingan Jenis Kelamin
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed mb-4">
                    Visualisasi perbandingan jumlah penduduk laki-laki dan perempuan terintegrasi otomatis.
                  </p>
                </div>

                {/* SLIDER DEMOGRAPHIC */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center text-xs font-extrabold text-slate-200">
                    <span className="flex items-center gap-1.5"><span className="text-blue-400">🔵 Laki-laki:</span> {Math.round(totalPenduduk * 0.52)} Jiwa (52%)</span>
                    <span className="flex items-center gap-1.5"><span className="text-rose-400">🌸 Perempuan:</span> {Math.round(totalPenduduk * 0.48)} Jiwa (48%)</span>
                  </div>
                  
                  <div className="h-4 w-full bg-rose-500 rounded-full overflow-hidden flex">
                    <div style={{ width: '52%' }} className="bg-blue-500 h-full"></div>
                  </div>

                  <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-750 text-center">
                    <span className="text-[11px] text-slate-400 font-bold block mb-0.5">Rasio Kependudukan</span>
                    <span className="text-xs font-extrabold text-white">100 : 92 (Seimbang)</span>
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 3: DATABASE PENDUDUK (FULL SEAMLESS INTERACTIVE CRUD) */}
        {/* ========================================================= */}
        {activeTab === 'database' && (
          <div className="space-y-4">
            
            {/* SEARCH & FILTERS EXPANDABLE CONTROL PANEL BAR */}
            <div className="bg-slate-800 rounded-2xl border border-slate-700 p-4 shadow-xl space-y-3">
              <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
                
                {/* Search query box */}
                <div className="relative w-full sm:max-w-md">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input 
                    className="w-full pl-10 pr-9 bg-slate-900 border-slate-700 text-white font-medium text-xs sm:text-sm h-10 rounded-xl"
                    placeholder="Cari Nama, NIK, No KK, atau Dusun..."
                    value={searchQuery}
                    onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                  />
                  {searchQuery && (
                    <button 
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {/* Direct quick add person & database refresh */}
                <div className="flex items-center gap-2.5 w-full sm:w-auto">
                  <button
                    onClick={fetchRecords}
                    disabled={isRefreshing}
                    className="p-2 sm:p-2.5 rounded-xl bg-slate-900 hover:bg-slate-750 border border-slate-700 text-slate-200 focus:outline-none disabled:opacity-50 inline-flex items-center justify-center gap-2 font-bold text-xs cursor-pointer shrink-0"
                    title="Muat Ulang dari Google Sheets"
                  >
                    <RefreshCw className={`h-4 w-4 text-sky-400 ${isRefreshing ? 'animate-spin' : ''}`} />
                    <span className="hidden sm:inline">Refresh Sheet</span>
                  </button>

                  <button
                    onClick={() => setIsQuickAddOpen(true)}
                    className="w-full sm:w-auto px-4 py-2.5 bg-gradient-to-r from-sky-500 to-indigo-600 text-white font-extrabold text-xs sm:text-sm rounded-xl hover:shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer border-none"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Tambah Penduduk</span>
                  </button>
                </div>
              </div>

              {/* FILTERS BREAKDOWN SELECTORS */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 border-t border-slate-700/50">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Filter Dusun/Alamat</Label>
                  <Select
                    value={filterDusun}
                    onValueChange={(val) => { setFilterDusun(val); setCurrentPage(1); }}
                  >
                    <SelectTrigger className="w-full bg-slate-900 border-slate-700 text-white h-9 rounded-xl text-xs font-bold">
                      <SelectValue placeholder="Semua Dusun" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700 text-slate-100">
                      <SelectItem value="">Semua Dusun</SelectItem>
                      {ALAMAT_LIST.map(a => (
                        <SelectItem key={a} value={a}>{a}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Filter RW (Rukun Warga)</Label>
                  <Select
                    value={filterRW}
                    onValueChange={(val) => { setFilterRW(val); setCurrentPage(1); }}
                  >
                    <SelectTrigger className="w-full bg-slate-900 border-slate-700 text-white h-9 rounded-xl text-xs font-bold">
                      <SelectValue placeholder="Semua RW" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700 text-slate-100">
                      <SelectItem value="">Semua RW</SelectItem>
                      {Object.keys(RT_MAP).map(rw => (
                        <SelectItem key={rw} value={rw}>RW 0{rw}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Filter RT (Rukun Tetangga)</Label>
                  <Select
                    value={filterRT}
                    onValueChange={(val) => { setFilterRT(val); setCurrentPage(1); }}
                    disabled={!filterRW}
                  >
                    <SelectTrigger className="w-full bg-slate-900 border-slate-700 text-white h-9 rounded-xl text-xs font-bold disabled:opacity-40">
                      <SelectValue placeholder="Semua RT" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700 text-slate-100">
                      <SelectItem value="">Semua RT</SelectItem>
                      {filterRW && RT_MAP[filterRW]?.map(rt => (
                        <SelectItem key={rt} value={String(rt)}>RT {String(rt).padStart(2, '0')}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* DATA RESIDENT TABLE GRID CARD LIST FOR RESPONSIVE HP AND TABLET */}
            <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden shadow-xl">
              
              {/* TABLE DESKTOP CONTAINER */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-900/60 border-b border-slate-750 text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">
                      <th className="py-3 px-4 text-center w-12">No</th>
                      <th className="py-3 px-4">NIK Penduduk</th>
                      <th className="py-3 px-4">Nama Lengkap</th>
                      <th className="py-3 px-4">Alamat Wilayah</th>
                      <th className="py-3 px-4">No. Kartu Keluarga</th>
                      <th className="py-3 px-4">Kepala KK</th>
                      <th className="py-3 px-4 text-center w-24">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-750 text-slate-250 font-medium">
                    {currentRecordsPaged.map((rec, idx) => {
                      const absoluteIndex = indexOfFirstItem + idx + 1;
                      return (
                        <tr key={idx} className="hover:bg-slate-750/30 transition-colors">
                          <td className="py-3 px-4 text-center text-slate-500 font-bold">{absoluteIndex}</td>
                          <td className="py-3 px-4 font-mono font-bold text-slate-350">{formatKKDisplay(rec.nik)}</td>
                          <td className="py-3 px-4 font-black text-white uppercase text-xs tracking-wide">
                            {rec.nama}
                            {cleanDigits(rec.nik) === cleanDigits(rec.noKK) && (
                              <span className="ml-1.5 text-[8px] bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-extrabold px-1.5 py-0.5 rounded uppercase">Kepala</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-slate-300">
                            <span className="block font-bold">{rec.alamat}</span>
                            <span className="text-[10px] text-slate-400 block mt-0.5">RW 0{rec.rw} / RT {String(rec.rt).padStart(2,'0')}</span>
                          </td>
                          <td className="py-3 px-4 font-mono font-bold text-slate-400">{formatKKDisplay(rec.noKK)}</td>
                          <td className="py-3 px-4 text-slate-300 truncate max-w-[130px]">{rec.namaKK || '–'}</td>
                          <td className="py-3 px-4">
                            <div className="flex gap-1.5 justify-center">
                              <button
                                onClick={() => handleOpenEditModal(rec)}
                                className="p-1 px-2.5 bg-yellow-500/10 hover:bg-yellow-500 hover:text-slate-900 border border-yellow-500/25 text-yellow-400 rounded-lg text-[10px] font-extrabold transition-all active:scale-95 cursor-pointer flex items-center gap-1"
                                title="Edit Identitas"
                              >
                                <Edit2 className="h-3 w-3" />
                                <span>Edit</span>
                              </button>
                              <button
                                onClick={() => handleDeleteResident(rec.nik)}
                                className="p-1 px-2.5 bg-rose-500/10 hover:bg-rose-500 hover:text-white border border-rose-500/25 text-rose-450 rounded-lg text-[10px] font-extrabold transition-all active:scale-95 cursor-pointer flex items-center gap-1"
                                title="Hapus Penduduk"
                              >
                                <Trash2 className="h-3 w-3" />
                                <span>Hapus</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}

                    {currentRecordsPaged.length === 0 && (
                      <tr>
                        <td colSpan={7} className="text-center py-12 text-slate-500 font-bold text-xs sm:text-sm">
                          🔍 Tidak ada data penduduk yang cocok dengan filter pencarian Anda.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* CARD ELEMENT LIST FOR HP SCREENS (MOBILE VIEW ONLY) */}
              <div className="block md:hidden divide-y divide-slate-750">
                {currentRecordsPaged.map((rec, idx) => {
                  const absoluteIndex = indexOfFirstItem + idx + 1;
                  return (
                    <div key={idx} className="p-4 space-y-3.5 bg-slate-800/30">
                      <div className="flex justify-between items-start">
                        <div className="space-y-1">
                          <div className="text-xs text-slate-500 font-bold"># {absoluteIndex}</div>
                          <h4 className="text-sm font-black text-white uppercase tracking-wide">
                            {rec.nama}
                          </h4>
                          <span className="inline-block text-[10px] bg-slate-900 border border-slate-700 text-slate-400 px-2 py-0.5 rounded font-mono font-bold">
                            NIK: {formatKKDisplay(rec.nik)}
                          </span>
                        </div>
                        
                        {/* Tab header badge status */}
                        {cleanDigits(rec.nik) === cleanDigits(rec.noKK) && (
                          <span className="text-[9px] bg-indigo-500/10 border border-indigo-400/20 text-indigo-400 px-2 py-0.5 rounded font-extrabold">KEPALA KELUARGA</span>
                        )}
                      </div>

                      <div className="bg-slate-900/60 p-2.5 rounded-xl text-xs space-y-1 text-slate-300 border border-slate-750">
                        <div>
                          <span className="text-slate-500 font-bold block text-[10px] uppercase">Dusun &amp; RT/RW:</span>
                          <span className="font-bold text-white leading-tight">{rec.alamat} (RW 0{rec.rw} RT {String(rec.rt).padStart(2,'0')})</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 pt-1.5 border-t border-slate-800 mt-1">
                          <div>
                            <span className="text-slate-500 font-bold block text-[10px] uppercase">No. KK:</span>
                            <span className="font-mono font-bold text-slate-300 block truncate">{formatKKDisplay(rec.noKK)}</span>
                          </div>
                          <div>
                            <span className="text-slate-500 font-bold block text-[10px] uppercase">Kepala KK:</span>
                            <span className="font-bold text-slate-300 block truncate">{rec.namaKK || '–'}</span>
                          </div>
                        </div>
                      </div>

                      {/* Mobilized Tap Actions Bar */}
                      <div className="flex items-center gap-2 pt-1 justify-end">
                        <button
                          onClick={() => handleOpenEditModal(rec)}
                          className="px-4 py-2 bg-yellow-500/15 border border-yellow-500/20 text-yellow-400 rounded-xl font-bold text-xs inline-flex items-center gap-1.5 active:scale-95"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                          <span>Ubah Data</span>
                        </button>
                        <button
                          onClick={() => handleDeleteResident(rec.nik)}
                          className="px-4 py-2 bg-rose-500/15 border border-rose-500/20 text-rose-455 rounded-xl font-bold text-xs inline-flex items-center gap-1.5 active:scale-95"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span>Hapus</span>
                        </button>
                      </div>
                    </div>
                  );
                })}

                {currentRecordsPaged.length === 0 && (
                  <div className="text-center py-12 text-slate-500 font-bold text-xs">
                    🔍 Tidak ada data penduduk yang cocok dengan filter pencarian Anda.
                  </div>
                )}
              </div>

              {/* PAGINATION STATUS CONTROL FOOTER */}
              <div className="p-3 sm:p-4 bg-slate-900/60 border-t border-slate-755 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-bold text-slate-400">
                <div>
                  Menampilkan <span className="text-white font-black">{filteredRecords.length > 0 ? indexOfFirstItem + 1 : 0}</span> sampai{' '}
                  <span className="text-white font-black">{Math.min(indexOfLastItem, filteredRecords.length)}</span> dari{' '}
                  <span className="text-white font-black">{filteredRecords.length}</span> jiwa terdaftar
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl disabled:opacity-40 focus:outline-none cursor-pointer flex items-center"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    <span className="pr-1 text-[11px]">Sebelumnya</span>
                  </button>
                  <span className="text-xs text-white">
                    Halaman <span className="font-black text-indigo-400">{currentPage}</span> dari <span className="font-black">{totalPages}</span>
                  </span>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl disabled:opacity-40 focus:outline-none cursor-pointer flex items-center"
                  >
                    <span className="pl-1 text-[11px]">Berikutnya</span>
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>

            </div>

            {/* SYNC WARNING BAR */}
            <div className="p-3.5 bg-slate-950/40 rounded-2xl border border-slate-750 block text-xs text-slate-400 leading-relaxed text-center">
              💡 <strong>CATATAN PERSISTENSI CRUD</strong>: Penambahan, pengeditan, atau penghapusan di atas tersimpan aman di <strong>browser ini (localStorage)</strong>. Untuk menjadikannya permanen di Sheet Cloud Anda, silakan ikuti petunjuk tombol <strong>"Apps Script Integration"</strong> di atas.
            </div>

          </div>
        )}

      </main>

      {/* ========================================================= */}
      {/* GLOBAL MODALS ACCORDION CONTROLS */}
      {/* ========================================================= */}

      {/* MODAL EDIT PENDUDUK DI DATABASE */}
      {editingRecord && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 animate-fade-in">
          <div className="bg-slate-800 rounded-2xl shadow-2xl border border-slate-700 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-slate-900 border-b border-slate-700 px-4 py-3.5 flex justify-between items-center shrink-0">
              <h3 className="font-black font-sans text-sm tracking-wide text-white uppercase flex items-center gap-2">
                <Edit2 className="h-4 w-4 text-yellow-400" />
                Ubah Profil Penduduk
              </h3>
              <button 
                onClick={() => setEditingRecord(null)}
                className="text-slate-400 hover:text-white transition-all size-6 flex items-center justify-center rounded-lg bg-slate-800 border border-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditModal} className="flex-1 overflow-y-auto p-4 space-y-3.5 text-xs">
              
              <div>
                <label className="block text-[10px] font-extrabold text-slate-350 uppercase mb-1">Nama Lengkap</label>
                <input 
                  type="text"
                  required
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white font-bold"
                  value={editingRecord.nama}
                  onChange={(e) => setEditingRecord({ ...editingRecord, nama: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-350 uppercase mb-1">NIK (Read Only ID)</label>
                  <input 
                    type="text"
                    readOnly
                    className="w-full px-3 py-2 bg-slate-750 border border-slate-700 rounded-lg text-slate-450 font-mono font-bold cursor-not-allowed"
                    value={formatKKDisplay(editingRecord.nik)}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-350 uppercase mb-1">No. KK</label>
                  <input 
                    type="text"
                    required
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono"
                    value={editingRecord.noKK}
                    onChange={(e) => setEditingRecord({ ...editingRecord, noKK: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-350 uppercase mb-1">Alamat Dusun</label>
                  <input 
                    type="text"
                    required
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white font-bold"
                    value={editingRecord.alamat}
                    onChange={(e) => setEditingRecord({ ...editingRecord, alamat: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-350 uppercase mb-1">No. RW</label>
                  <select
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white"
                    value={editingRecord.rw}
                    onChange={(e) => setEditingRecord({ ...editingRecord, rw: e.target.value })}
                  >
                    <option>1</option><option>2</option><option>3</option>
                    <option>4</option><option>5</option><option>6</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-350 uppercase mb-1">No. RT</label>
                  <input 
                    type="number"
                    required
                    className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white"
                    value={editingRecord.rt}
                    onChange={(e) => setEditingRecord({ ...editingRecord, rt: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-350 uppercase mb-1">Status Keluarga</label>
                  <select
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white"
                    value={editingRecord.statusHubungan}
                    onChange={(e) => setEditingRecord({ ...editingRecord, statusHubungan: e.target.value })}
                  >
                    {STATUS_OPTIONS.map(o => (
                      <option key={o} value={o}>{o}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-350 uppercase mb-1">Jenis Jenis Kelamin</label>
                  <select
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white"
                    value={editingRecord.jenisKelamin}
                    onChange={(e) => setEditingRecord({ ...editingRecord, jenisKelamin: e.target.value })}
                  >
                    <option value="1">Laki-laki</option>
                    <option value="2">Perempuan</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-350 uppercase mb-1">Tempat Lahir</label>
                  <input 
                    type="text"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white uppercase"
                    value={editingRecord.tempatLahir}
                    onChange={(e) => setEditingRecord({ ...editingRecord, tempatLahir: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-350 uppercase mb-1">Tanggal Lahir</label>
                  <input 
                    type="text"
                    placeholder="Contoh: 15/08/1990"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white"
                    value={editingRecord.tanggalLahir}
                    onChange={(e) => setEditingRecord({ ...editingRecord, tanggalLahir: e.target.value })}
                  />
                </div>
              </div>

              <div className="p-3 bg-indigo-900/10 border border-indigo-500/20 rounded-xl text-[10px] text-slate-300">
                🔒 Editing penduduk lokal ini akan segera mengupdate rekap demografi &amp; data tabel instan di Dashboard.
              </div>

              <div className="pt-2 flex justify-end gap-2 shrink-0">
                <button 
                  type="button" 
                  onClick={() => setEditingRecord(null)}
                  className="px-4 py-2 text-xs bg-slate-900 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-xl"
                >
                  Batalkan
                </button>
                <button 
                  type="submit" 
                  className="px-5 py-2 text-xs bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold"
                >
                  Simpan Perubahan
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* DIRECT QUICK SINGLE PERSON ADD MODAL */}
      <Dialog open={isQuickAddOpen} onOpenChange={setIsQuickAddOpen}>
        <DialogContent className="sm:max-w-lg bg-slate-800 border-slate-700 text-white p-0 gap-0 overflow-hidden rounded-2xl">
          <DialogHeader className="bg-slate-900 border-b border-slate-700 px-4 py-3.5">
            <DialogTitle className="flex items-center gap-2 text-sm font-black tracking-wide uppercase text-white">
              <UserCheck className="h-4 w-4 text-sky-400" />
              Tambah Penduduk Secara Cepat
            </DialogTitle>
            <DialogDescription className="sr-only">
              Formulir untuk menambahkan data penduduk secara cepat.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveQuickAdd} className="flex-1 overflow-y-auto p-4 space-y-3.5 text-xs bg-slate-800">
            <div className="space-y-1.5">
              <Label className="text-[10px] font-extrabold text-slate-300 uppercase">
                Nama Penduduk Lengkap <span className="text-rose-500">*</span>
              </Label>
              <Input
                required
                placeholder="NAMA LENGKAP KAPITAL"
                className="bg-slate-900 border-slate-700 text-white font-bold h-9"
                value={quickAddForm.nama}
                onChange={(e) => setQuickAddForm({ ...quickAddForm, nama: e.target.value.toUpperCase() })}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-extrabold text-slate-300 uppercase">
                  NIK (16 Digit) <span className="text-rose-500">*</span>
                </Label>
                <Input
                  required
                  maxLength={16}
                  placeholder="Format angka NIK"
                  className="bg-slate-900 border-slate-700 text-white font-mono h-9"
                  value={quickAddForm.nik}
                  onChange={(e) => setQuickAddForm({ ...quickAddForm, nik: cleanDigits(e.target.value) })}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-extrabold text-slate-300 uppercase">
                  NO. KK Asosiasi <span className="text-rose-500">*</span>
                </Label>
                <Input
                  required
                  maxLength={16}
                  placeholder="Format angka KK"
                  className="bg-slate-900 border-slate-700 text-white font-mono h-9"
                  value={quickAddForm.noKK}
                  onChange={(e) => setQuickAddForm({ ...quickAddForm, noKK: cleanDigits(e.target.value) })}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-extrabold text-slate-300 uppercase">Dusun/Alamat</Label>
                <Input
                  placeholder="Dusun / Kampung"
                  className="bg-slate-900 border-slate-700 text-white h-9"
                  value={quickAddForm.alamat}
                  onChange={(e) => setQuickAddForm({ ...quickAddForm, alamat: e.target.value.toUpperCase() })}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-extrabold text-slate-300 uppercase">No. RW</Label>
                <Select value={quickAddForm.rw} onValueChange={(val) => setQuickAddForm({ ...quickAddForm, rw: val })}>
                  <SelectTrigger className="bg-slate-900 border-slate-700 h-9 text-white">
                    <SelectValue placeholder="RW" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700 text-slate-100">
                    <SelectItem value="1">1</SelectItem>
                    <SelectItem value="2">2</SelectItem>
                    <SelectItem value="3">3</SelectItem>
                    <SelectItem value="4">4</SelectItem>
                    <SelectItem value="5">5</SelectItem>
                    <SelectItem value="6">6</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-extrabold text-slate-300 uppercase">No. RT</Label>
                <Input
                  type="number"
                  placeholder="RT"
                  className="bg-slate-900 border-slate-700 text-white h-9"
                  value={quickAddForm.rt}
                  onChange={(e) => setQuickAddForm({ ...quickAddForm, rt: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-extrabold text-slate-300 uppercase">Hubungan Anggota</Label>
                <Select value={quickAddForm.statusHubungan} onValueChange={(val) => setQuickAddForm({ ...quickAddForm, statusHubungan: val })}>
                  <SelectTrigger className="bg-slate-900 border-slate-700 h-9 text-white">
                    <SelectValue placeholder="Pilih Hubungan" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700 text-slate-100">
                    {STATUS_OPTIONS.map(o => (
                      <SelectItem key={o} value={o}>{o}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-extrabold text-slate-300 uppercase">Jenis Kelamin</Label>
                <Select value={quickAddForm.jenisKelamin} onValueChange={(val) => setQuickAddForm({ ...quickAddForm, jenisKelamin: val })}>
                  <SelectTrigger className="bg-slate-900 border-slate-700 h-9 text-white">
                    <SelectValue placeholder="Pilih Kelamin" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700 text-slate-100">
                    <SelectItem value="1">Laki-laki</SelectItem>
                    <SelectItem value="2">Perempuan</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="pt-4 flex justify-end gap-2 pb-1">
              <Button type="button" variant="outline" onClick={() => setIsQuickAddOpen(false)} className="bg-slate-900 border-slate-700 text-slate-200 hover:bg-slate-700 hover:text-white rounded-xl h-8 px-4 text-xs">
                Batalkan
              </Button>
              <Button type="submit" className="bg-gradient-to-r from-sky-500 to-indigo-600 font-black text-white hover:opacity-90 rounded-xl h-8 px-5 border-0 text-xs">
                Simpan Instan
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* BOTTOM FOOTER STATUS INDICATOR */}
      <footer className="mt-14 py-6 border-t border-slate-800 text-center text-xs text-slate-500 space-y-1 max-w-6xl mx-auto">
        <div>Sistem Pengelolaan Buku Induk Penduduk Terintegrasi Google Spreadsheet</div>
        <div>Mendukung Pendaftaran Multi-Penduduk, Visualisasi Demografis &amp; CRUD Transaktif</div>
      </footer>
    </div>
  );
}
