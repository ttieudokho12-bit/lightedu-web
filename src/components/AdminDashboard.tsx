import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { UserPlus, Users, Trash2, Shield, GraduationCap, UserCheck, Mail, Lock, User as UserIcon, Loader2, Search, FileText, CheckCircle2, AlertCircle, Download, School, Pencil, X, BookOpenCheck, Key, Calendar, Plus, MapPin, Copy } from 'lucide-react';
import * as XLSX from 'xlsx';
import { db, auth, handleFirestoreError, OperationType, cleanFirestoreData } from '../firebase';
import { collection, query, onSnapshot, doc, setDoc, updateDoc, deleteDoc, getDocs, where } from 'firebase/firestore';
import { UserProfile, ClassRoom, Subject, SUBJECTS, DEFAULT_SCHOOL_YEAR, PRESET_SCHOOL_YEARS } from '../types';
import { initializeApp, getApp, getApps } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { LocationSchoolSelector } from './LocationSchoolSelector';
import {
  DEFAULT_PROVINCE,
  getProvinces,
  getCommunesByProvince,
  getSchoolsByCommune,
  normalizeViSearch,
} from '../data/schoolCatalog';
import {
  SOURCE_TOPICS_SCHOOL_YEAR,
  TARGET_INHERIT_SCHOOL_YEAR,
  hasAnyCustomTopics,
  mergeCustomTopicsMaps,
  getInheritedCustomTopicsForClass,
  extractGradeDigit,
} from '../utils/classTopicsSync';

// Secondary app for creating users without logging out the admin
const getSecondaryAuth = () => {
  const secondaryAppName = 'BulkCreateApp';
  let secondaryApp;
  if (getApps().find(app => app.name === secondaryAppName)) {
    secondaryApp = getApp(secondaryAppName);
  } else {
    secondaryApp = initializeApp(firebaseConfig, secondaryAppName);
  }
  return getAuth(secondaryApp);
};

interface AdminDashboardProps {
  selectedSchoolYear?: string;
  onChangeSchoolYear?: (year: string) => void;
}

export default function AdminDashboard({ selectedSchoolYear: selectedSchoolYearProp, onChangeSchoolYear: onChangeSchoolYearProp }: AdminDashboardProps) {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSchoolYear, setSelectedSchoolYear] = useState<string>(selectedSchoolYearProp || DEFAULT_SCHOOL_YEAR);

  useEffect(() => {
    if (selectedSchoolYearProp && selectedSchoolYearProp !== selectedSchoolYear) {
      setSelectedSchoolYear(selectedSchoolYearProp);
      setSelectedClassFilter('all');
      setSelectedUserIds([]);
      setSelectedClassId('');
      setSelectedTeacherClassIds([]);
      setBulkClassId('');
      setBulkSelectedTeacherClassIds([]);
      setSelectedTopicClassId('');
      setBulkResults([]);
    }
  }, [selectedSchoolYearProp]);
  const [customSchoolYears, setCustomSchoolYears] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('adminCustomSchoolYears');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });
  const [isAddingSchoolYear, setIsAddingSchoolYear] = useState(false);
  const [newSchoolYearInput, setNewSchoolYearInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<'all' | 'student' | 'teacher'>('all');
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>('all');
  const [selectedProvinceFilter, setSelectedProvinceFilter] = useState<string>('all');
  const [selectedCommuneFilter, setSelectedCommuneFilter] = useState<string>('all');
  const [selectedSchoolFilter, setSelectedSchoolFilter] = useState<string>('all');
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  
  // New Class Form
  const [newClassName, setNewClassName] = useState('');
  const [isCreatingClass, setIsCreatingClass] = useState(false);

  // Custom Topics Management State
  const [selectedTopicClassId, setSelectedTopicClassId] = useState('');
  const [selectedTopicSubject, setSelectedTopicSubject] = useState<Subject>('Toán Lớp 1');
  const [newCustomTopic, setNewCustomTopic] = useState('');
  const [isAddingTopic, setIsAddingTopic] = useState(false);
  
  // New User Form
  const [displayName, setDisplayName] = useState('');
  const [role, setRole] = useState<'student' | 'teacher'>('student');
  const [selectedClassId, setSelectedClassId] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');

  // Student & Teacher Metadata States for Creation
  const [schoolName, setSchoolName] = useState('');
  const [communeName, setCommuneName] = useState('');
  const [provinceName, setProvinceName] = useState(DEFAULT_PROVINCE);
  const [selectedGrades, setSelectedGrades] = useState<string[]>([]);
  const [selectedTeacherSubjects, setSelectedTeacherSubjects] = useState<Subject[]>([]);
  const [selectedTeacherClassIds, setSelectedTeacherClassIds] = useState<string[]>([]);

  // Bulk Create State
  const [bulkNames, setBulkNames] = useState('');
  const [bulkRole, setBulkRole] = useState<'student' | 'teacher'>('student');
  const [bulkClassId, setBulkClassId] = useState('');
  const [isBulkCreating, setIsBulkCreating] = useState(false);
  const [bulkResults, setBulkResults] = useState<{name: string, email?: string, status: string, message?: string}[]>([]);

  // Bulk Student & Teacher Metadata States
  const [bulkSchoolName, setBulkSchoolName] = useState('');
  const [bulkCommuneName, setBulkCommuneName] = useState('');
  const [bulkProvinceName, setBulkProvinceName] = useState(DEFAULT_PROVINCE);
  const [bulkSelectedGrades, setBulkSelectedGrades] = useState<string[]>([]);
  const [bulkSelectedTeacherSubjects, setBulkSelectedTeacherSubjects] = useState<Subject[]>([]);
  const [bulkSelectedTeacherClassIds, setBulkSelectedTeacherClassIds] = useState<string[]>([]);

  // Editing User States
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [editDisplayName, setEditDisplayName] = useState('');
  const [editSchoolYear, setEditSchoolYear] = useState<string>(DEFAULT_SCHOOL_YEAR);
  const [editClassId, setEditClassId] = useState('');
  const [editSchoolName, setEditSchoolName] = useState('');
  const [editCommuneName, setEditCommuneName] = useState('');
  const [editProvinceName, setEditProvinceName] = useState('');
  const [editAllowedGrades, setEditAllowedGrades] = useState<string[]>([]);
  const [editAllowedSubjects, setEditAllowedSubjects] = useState<Subject[]>([]);
  const [editAllowedClassIds, setEditAllowedClassIds] = useState<string[]>([]);
  const [isUpdatingUser, setIsUpdatingUser] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  useEffect(() => {
    const qUsers = query(collection(db, 'users'));
    const unsubscribeUsers = onSnapshot(qUsers, (snapshot) => {
      const userList = snapshot.docs.map(doc => doc.data() as UserProfile);
      setUsers(userList);
      setLoading(false);
    });

    const qClasses = query(collection(db, 'classes'));
    const unsubscribeClasses = onSnapshot(qClasses, (snapshot) => {
      const classList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ClassRoom));
      setClasses(classList);
    });

    return () => {
      unsubscribeUsers();
      unsubscribeClasses();
    };
  }, []);

  // Automatically migrate all existing accounts (non-admin) & classes without schoolYear to 2025-2026
  const migratedUserYearsRef = React.useRef<Set<string>>(new Set());
  const migratedClassYearsRef = React.useRef<Set<string>>(new Set());
  const synced2026ClassTopicsRef = React.useRef<Set<string>>(new Set());
  const [isSyncingTopicsFrom2025, setIsSyncingTopicsFrom2025] = useState(false);

  useEffect(() => {
    const legacyUsers = users.filter(
      u => u.role !== 'admin' && !u.schoolYear && !migratedUserYearsRef.current.has(u.uid)
    );
    if (legacyUsers.length === 0) return;

    legacyUsers.forEach(u => migratedUserYearsRef.current.add(u.uid));
    (async () => {
      for (const u of legacyUsers) {
        try {
          await updateDoc(doc(db, 'users', u.uid), { schoolYear: DEFAULT_SCHOOL_YEAR });
        } catch (err) {
          console.warn(`Could not assign default schoolYear to user ${u.uid}:`, err);
        }
      }
    })();
  }, [users]);

  useEffect(() => {
    const legacyClasses = classes.filter(
      c => !c.schoolYear && !migratedClassYearsRef.current.has(c.id)
    );
    if (legacyClasses.length === 0) return;

    legacyClasses.forEach(c => migratedClassYearsRef.current.add(c.id));
    (async () => {
      for (const cls of legacyClasses) {
        try {
          await updateDoc(doc(db, 'classes', cls.id), { schoolYear: DEFAULT_SCHOOL_YEAR });
        } catch (err) {
          console.warn(`Could not assign default schoolYear to class ${cls.id}:`, err);
        }
      }
    })();
  }, [classes]);

  // Automatically inherit customTopics from 2025-2026 into 2026-2027 classes that don't have customTopics yet
  useEffect(() => {
    if (classes.length === 0) return;
    const classes2025WithTopics = classes.filter(
      c => (c.schoolYear || DEFAULT_SCHOOL_YEAR) === SOURCE_TOPICS_SCHOOL_YEAR && hasAnyCustomTopics(c.customTopics)
    );
    if (classes2025WithTopics.length === 0) return;

    const targetClassesToSync = classes.filter(
      c =>
        c.schoolYear === TARGET_INHERIT_SCHOOL_YEAR &&
        c.customTopics === undefined &&
        !synced2026ClassTopicsRef.current.has(c.id)
    );
    if (targetClassesToSync.length === 0) return;

    (async () => {
      for (const cls of targetClassesToSync) {
        const inherited = getInheritedCustomTopicsForClass(cls.name, classes, SOURCE_TOPICS_SCHOOL_YEAR);
        if (!hasAnyCustomTopics(inherited)) continue;
        synced2026ClassTopicsRef.current.add(cls.id);
        try {
          await setDoc(doc(db, 'classes', cls.id), { customTopics: inherited }, { merge: true });
        } catch (err) {
          console.warn(`Could not inherit customTopics from 2025-2026 for class ${cls.id}:`, err);
        }
      }
    })();
  }, [classes]);

  const availableSchoolYears = React.useMemo(() => {
    const yearSet = new Set<string>([...PRESET_SCHOOL_YEARS, ...customSchoolYears, selectedSchoolYear]);
    users.forEach(u => {
      if (u.schoolYear) yearSet.add(u.schoolYear);
    });
    classes.forEach(c => {
      if (c.schoolYear) yearSet.add(c.schoolYear);
    });
    return Array.from(yearSet).sort();
  }, [customSchoolYears, selectedSchoolYear, users, classes]);

  const classesInYear = React.useMemo(
    () => classes.filter(c => (c.schoolYear || DEFAULT_SCHOOL_YEAR) === selectedSchoolYear),
    [classes, selectedSchoolYear]
  );

  const usersInYear = React.useMemo(
    () => users.filter(u => u.role !== 'admin' && (u.schoolYear || DEFAULT_SCHOOL_YEAR) === selectedSchoolYear),
    [users, selectedSchoolYear]
  );

  const teacherCountInYear = React.useMemo(
    () => usersInYear.filter(u => u.role === 'teacher').length,
    [usersInYear]
  );

  const studentCountInYear = React.useMemo(
    () => usersInYear.filter(u => u.role === 'student').length,
    [usersInYear]
  );

  const handleChangeSchoolYear = (year: string) => {
    setSelectedSchoolYear(year);
    onChangeSchoolYearProp?.(year);
    setSelectedClassFilter('all');
    setSelectedUserIds([]);
    setSelectedClassId('');
    setSelectedTeacherClassIds([]);
    setBulkClassId('');
    setBulkSelectedTeacherClassIds([]);
    setSelectedTopicClassId('');
    setBulkResults([]);
  };

  const handleAddSchoolYear = () => {
    const cleaned = newSchoolYearInput.trim();
    if (!cleaned) return;
    if (!/^\d{4}-\d{4}$/.test(cleaned)) {
      alert('Vui lòng nhập năm học đúng định dạng YYYY-YYYY (Ví dụ: 2030-2031)');
      return;
    }
    if (!availableSchoolYears.includes(cleaned)) {
      const updated = [...customSchoolYears, cleaned];
      setCustomSchoolYears(updated);
      try {
        localStorage.setItem('adminCustomSchoolYears', JSON.stringify(updated));
      } catch {}
    }
    handleChangeSchoolYear(cleaned);
    setNewSchoolYearInput('');
    setIsAddingSchoolYear(false);
  };

  const createSingleUser = async (
    name: string, 
    userRole: 'student' | 'teacher', 
    classId?: string,
    studentSchool?: string,
    studentCommune?: string,
    studentProvince?: string,
    studentAllowedGrades?: string[],
    teacherAllowedSubjects?: Subject[],
    teacherAllowedClassIds?: string[]
  ) => {
    const secondaryAuth = getSecondaryAuth();
    
    // Normalize name to create username
    const baseUsername = name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/\s+/g, '.')
      .replace(/[^a-z0-9.]/g, '');
    
    const randomSuffix = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    const username = `${baseUsername}.${randomSuffix}`;
    const email = `${username}@lightedu.vn`;
    const password = '123456';

    let newUserUid = '';
    let newUserEmail = email;
    let authSucceeded = false;

    try {
      // 1. Create in Auth
      const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, password);
      const newUser = userCredential.user;
      newUserUid = newUser.uid;
      newUserEmail = newUser.email || email;
      authSucceeded = true;
    } catch (authErr: any) {
      console.warn(`Auth registration failed for ${name}, using local Firestore user fallback:`, authErr);
      // Fallback: Generate a unique local UID
      newUserUid = `local_${username}_${Math.floor(Math.random() * 100000)}`;
      newUserEmail = email;
    }

    try {
      // 2. Create profile in Firestore
      let grade: string | undefined = undefined;
      if (userRole === 'student' && classId) {
        const cls = classesInYear.find(c => c.id === classId) || classes.find(c => c.id === classId);
        if (cls) {
          const match = cls.name.match(/Lớp\s*([1-5])/i);
          if (match && match[1]) {
            grade = `Lớp ${match[1]}`;
          }
        }
      }

      // Automatically assign the class grade to allowedGrades, combined with additional selected grades
      const defaultGrades = grade ? [grade] : [];
      const finalAllowedGrades = Array.from(new Set([...defaultGrades, ...(studentAllowedGrades || [])]));

      const profile: UserProfile & { password?: string } = {
        uid: newUserUid,
        email: newUserEmail,
        displayName: name,
        role: userRole,
        schoolYear: selectedSchoolYear,
        classId: userRole === 'student' ? classId : undefined,
        grade: userRole === 'student' ? grade : undefined,
        schoolName: studentSchool?.trim() || undefined,
        communeName: studentCommune?.trim() || undefined,
        provinceName: studentProvince?.trim() || undefined,
        allowedGrades: userRole === 'student' ? finalAllowedGrades : undefined,
        allowedSubjects: userRole === 'teacher' ? (teacherAllowedSubjects && teacherAllowedSubjects.length > 0 ? teacherAllowedSubjects : undefined) : undefined,
        allowedClassIds: userRole === 'teacher' ? (teacherAllowedClassIds && teacherAllowedClassIds.length > 0 ? teacherAllowedClassIds : undefined) : undefined,
        password: password // Store the password for fallback authentication
      };

      await setDoc(doc(db, 'users', newUserUid), cleanFirestoreData(profile));
      
      // 3. Sign out from secondary app if auth succeeded
      if (authSucceeded) {
        await signOut(secondaryAuth);
      }

      return { name, email: newUserEmail, status: 'success' };
    } catch (err: any) {
      console.error(`Error creating user ${name}:`, err);
      return { name, status: 'error', message: err.message };
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) return;
    if (role === 'student') {
      if (!selectedClassId) {
        setError('Vui lòng chọn lớp cho học sinh');
        return;
      }
      if (!provinceName.trim()) {
        setError('Vui lòng chọn tên tỉnh');
        return;
      }
      if (!communeName.trim()) {
        setError('Vui lòng chọn tên xã / phường');
        return;
      }
      if (!schoolName.trim()) {
        setError('Vui lòng chọn tên trường');
        return;
      }
    }
    
    setError('');
    setIsCreating(true);

    const result = await createSingleUser(
      displayName, 
      role, 
      selectedClassId, 
      schoolName, 
      communeName, 
      provinceName, 
      selectedGrades,
      selectedTeacherSubjects,
      selectedTeacherClassIds
    );
    
    if (result.status === 'success') {
      setDisplayName('');
      setSchoolName('');
      setCommuneName('');
      setProvinceName(DEFAULT_PROVINCE);
      setSelectedGrades([]);
      setSelectedTeacherSubjects([]);
      setSelectedTeacherClassIds([]);
      alert('Tạo tài khoản thành công!');
    } else {
      setError(result.message || 'Lỗi khi tạo tài khoản');
    }
    
    setIsCreating(false);
  };

  const handleBulkCreate = async () => {
    if (!bulkNames.trim()) return;
    if (bulkRole === 'student') {
      if (!bulkClassId) {
        setError('Vui lòng chọn lớp cho học sinh');
        return;
      }
      if (!bulkProvinceName.trim()) {
        setError('Vui lòng chọn tên tỉnh cho danh sách học sinh');
        return;
      }
      if (!bulkCommuneName.trim()) {
        setError('Vui lòng chọn tên xã / phường cho danh sách học sinh');
        return;
      }
      if (!bulkSchoolName.trim()) {
        setError('Vui lòng chọn tên trường cho danh sách học sinh');
        return;
      }
    }
    
    setError('');
    setIsBulkCreating(true);
    setBulkResults([]);

    const names = bulkNames.split('\n').map(n => n.trim()).filter(n => n.length > 0);
    const results = [];

    for (const name of names) {
      const res = await createSingleUser(
        name, 
        bulkRole, 
        bulkClassId, 
        bulkSchoolName, 
        bulkCommuneName, 
        bulkProvinceName, 
        bulkSelectedGrades,
        bulkSelectedTeacherSubjects,
        bulkSelectedTeacherClassIds
      );
      results.push(res);
      // Update results live
      setBulkResults([...results]);
    }

    setBulkNames('');
    setBulkSchoolName('');
    setBulkCommuneName('');
    setBulkProvinceName(DEFAULT_PROVINCE);
    setBulkSelectedGrades([]);
    setBulkSelectedTeacherSubjects([]);
    setBulkSelectedTeacherClassIds([]);
    
    if (results.every(r => r.status === 'success')) {
      alert(`Đã tạo thành công ${results.length} tài khoản!`);
    }
    
    setIsBulkCreating(false);
  };

  const downloadResults = () => {
    if (bulkResults.length === 0) return;
    
    const header = "Họ và tên,Tên đăng nhập,Mật khẩu,Trạng thái\n";
    const rows = bulkResults.map(res => {
      const username = res.email ? res.email.split('@')[0] : '';
      const password = res.status === 'success' ? '123456' : '';
      return `"${res.name}","${username}","${password}","${res.status === 'success' ? 'Thành công' : 'Lỗi'}"`;
    }).join("\n");
    
    const csvContent = "\uFEFF" + header + rows; // Add BOM for Excel UTF-8 support
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `danh_sach_tai_khoan_${new Date().getTime()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDeleteUser = (uid: string) => {
    const targetUser = users.find(u => u.uid === uid);
    const name = targetUser?.displayName || targetUser?.email || 'tài khoản này';
    setConfirmModal({
      isOpen: true,
      title: 'Xác nhận xóa tài khoản',
      message: `Bạn có đồng ý xóa tài khoản "${name}" không? Hành động này không thể hoàn tác.`,
      onConfirm: async () => {
        setLoading(true);
        try {
          // 1. Try server-side deletion (to delete both Auth and Firestore document)
          const response = await fetch('/api/admin/delete-user', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ uid }),
          });
          
          if (response.ok) {
            setSelectedUserIds(prev => prev.filter(id => id !== uid));
            setUsers(prev => prev.filter(u => u.uid !== uid));
            alert('Xóa tài khoản thành công!');
          } else {
            // 2. Client-side fallback: delete Firestore document directly
            console.warn('Server-side deletion failed, attempting client-side fallback...');
            await deleteDoc(doc(db, 'users', uid));
            setSelectedUserIds(prev => prev.filter(id => id !== uid));
            setUsers(prev => prev.filter(u => u.uid !== uid));
            alert('Xóa tài khoản thành công (dự phòng)!');
          }
        } catch (error) {
          console.error('Error deleting user, trying client-side fallback:', error);
          try {
            await deleteDoc(doc(db, 'users', uid));
            setSelectedUserIds(prev => prev.filter(id => id !== uid));
            setUsers(prev => prev.filter(u => u.uid !== uid));
            alert('Xóa tài khoản thành công (dự phòng)!');
          } catch (clientErr) {
            console.error('Client-side fallback also failed:', clientErr);
            alert('Không thể xóa tài khoản. Vui lòng thử lại!');
          }
        } finally {
          setLoading(false);
        }
      }
    });
  };

  const handleStartEditUser = (user: UserProfile) => {
    setEditingUser(user);
    setEditDisplayName(user.displayName || '');
    setEditSchoolYear(user.schoolYear || DEFAULT_SCHOOL_YEAR);
    setEditClassId(user.classId || '');
    setEditSchoolName(user.schoolName || '');
    setEditCommuneName(user.communeName || '');
    setEditProvinceName(user.provinceName || '');
    setEditAllowedGrades(user.allowedGrades || []);
    setEditAllowedSubjects(user.allowedSubjects || []);
    setEditAllowedClassIds(user.allowedClassIds || []);
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    if (editingUser.role === 'teacher') {
      if (!editDisplayName.trim()) {
        alert('Vui lòng nhập tên giáo viên');
        return;
      }
      setIsUpdatingUser(true);
      try {
        const updatedProfile: Partial<UserProfile> = {
          displayName: editDisplayName,
          schoolYear: editSchoolYear,
          provinceName: editProvinceName.trim(),
          communeName: editCommuneName.trim(),
          schoolName: editSchoolName.trim(),
          allowedSubjects: editAllowedSubjects,
          allowedClassIds: editAllowedClassIds
        };
        await setDoc(doc(db, 'users', editingUser.uid), cleanFirestoreData(updatedProfile), { merge: true });
        alert('Cập nhật thông tin giáo viên thành công!');
        setEditingUser(null);
      } catch (error) {
        console.error('Error updating teacher:', error);
        alert('Lỗi khi cập nhật thông tin');
      } finally {
        setIsUpdatingUser(false);
      }
      return;
    }

    if (!editDisplayName.trim()) {
      alert('Vui lòng nhập tên học sinh');
      return;
    }
    if (!editClassId) {
      alert('Vui lòng chọn lớp học');
      return;
    }
    if (!editProvinceName.trim()) {
      alert('Vui lòng chọn tên tỉnh');
      return;
    }
    if (!editCommuneName.trim()) {
      alert('Vui lòng chọn tên xã / phường');
      return;
    }
    if (!editSchoolName.trim()) {
      alert('Vui lòng chọn tên trường');
      return;
    }

    setIsUpdatingUser(true);
    try {
      let grade: string | undefined = undefined;
      const cls = classes.find(c => c.id === editClassId);
      if (cls) {
        const match = cls.name.match(/Lớp\s*([1-5])/i);
        if (match && match[1]) {
          grade = `Lớp ${match[1]}`;
        }
      }

      const defaultGrades = grade ? [grade] : [];
      const finalAllowedGrades = Array.from(new Set([...defaultGrades, ...(editAllowedGrades || [])]));

      const updatedProfile: Partial<UserProfile> = {
        displayName: editDisplayName,
        schoolYear: editSchoolYear,
        classId: editClassId,
        grade: grade,
        schoolName: editSchoolName,
        communeName: editCommuneName,
        provinceName: editProvinceName,
        allowedGrades: finalAllowedGrades
      };

      await setDoc(doc(db, 'users', editingUser.uid), cleanFirestoreData(updatedProfile), { merge: true });
      
      alert('Cập nhật thông tin học sinh thành công!');
      setEditingUser(null);
    } catch (error) {
      console.error('Error updating user:', error);
      alert('Lỗi khi cập nhật thông tin');
    } finally {
      setIsUpdatingUser(false);
    }
  };

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassName.trim()) return;
    
    setIsCreatingClass(true);
    try {
      const classId = Math.random().toString(36).substring(2, 8).toUpperCase();
      const trimmedName = newClassName.trim();
      const inheritedTopics =
        selectedSchoolYear === TARGET_INHERIT_SCHOOL_YEAR
          ? getInheritedCustomTopicsForClass(trimmedName, classes, SOURCE_TOPICS_SCHOOL_YEAR)
          : {};
      const hasInherited = hasAnyCustomTopics(inheritedTopics);

      await setDoc(doc(db, 'classes', classId), cleanFirestoreData({
        name: trimmedName,
        teacherId: auth.currentUser?.uid || 'admin',
        schoolYear: selectedSchoolYear,
        customTopics: hasInherited ? inheritedTopics : undefined
      }));
      setNewClassName('');
      alert(
        hasInherited
          ? `Đã tạo lớp ${trimmedName} (Năm học ${selectedSchoolYear}) và tự động kế thừa chủ đề từ năm học ${SOURCE_TOPICS_SCHOOL_YEAR}! Mã lớp: ${classId}`
          : `Đã tạo lớp ${trimmedName} (Năm học ${selectedSchoolYear}) thành công! Mã lớp: ${classId}`
      );
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'classes');
    } finally {
      setIsCreatingClass(false);
    }
  };

  const handleSyncTopicsFrom2025 = async () => {
    const classes2025WithTopics = classes.filter(
      c => (c.schoolYear || DEFAULT_SCHOOL_YEAR) === SOURCE_TOPICS_SCHOOL_YEAR && hasAnyCustomTopics(c.customTopics)
    );

    if (classes2025WithTopics.length === 0) {
      alert(`Năm học ${SOURCE_TOPICS_SCHOOL_YEAR} chưa có chủ đề tự tạo nào để đồng bộ.`);
      return;
    }

    setIsSyncingTopicsFrom2025(true);
    try {
      let updatedCount = 0;
      let createdCount = 0;

      // 1. Update all existing classes in selectedSchoolYear with matching 2025-2026 topics
      for (const cls of classesInYear) {
        const inherited = getInheritedCustomTopicsForClass(cls.name, classes, SOURCE_TOPICS_SCHOOL_YEAR);
        if (!hasAnyCustomTopics(inherited)) continue;
        const merged = mergeCustomTopicsMaps([cls.customTopics, inherited]);
        await setDoc(doc(db, 'classes', cls.id), { customTopics: merged }, { merge: true });
        updatedCount++;
      }

      // 2. If a 2025-2026 class with topics has no class of the same grade in selectedSchoolYear yet,
      //    create a matching class in selectedSchoolYear carrying the exact same customTopics.
      const existingGradesInTarget = new Set(
        classesInYear.map(c => extractGradeDigit(c.name) || c.name.toLowerCase().trim())
      );

      for (const srcCls of classes2025WithTopics) {
        const key = extractGradeDigit(srcCls.name) || srcCls.name.toLowerCase().trim();
        if (existingGradesInTarget.has(key)) continue;

        const newId = Math.random().toString(36).substring(2, 8).toUpperCase();
        await setDoc(doc(db, 'classes', newId), {
          name: srcCls.name,
          teacherId: srcCls.teacherId || auth.currentUser?.uid || 'admin',
          schoolYear: selectedSchoolYear,
          customTopics: srcCls.customTopics || {}
        });
        existingGradesInTarget.add(key);
        createdCount++;
      }

      if (updatedCount === 0 && createdCount === 0) {
        alert(`Chủ đề lớp năm học ${selectedSchoolYear} đã đồng bộ đầy đủ với năm học ${SOURCE_TOPICS_SCHOOL_YEAR}.`);
      } else {
        const parts: string[] = [];
        if (updatedCount > 0) parts.push(`cập nhật chủ đề cho ${updatedCount} lớp`);
        if (createdCount > 0) parts.push(`tạo mới ${createdCount} lớp kèm chủ đề`);
        alert(`Đã đồng bộ chủ đề từ Năm học ${SOURCE_TOPICS_SCHOOL_YEAR} sang ${selectedSchoolYear}: ${parts.join(', ')}!`);
      }
    } catch (error) {
      console.error('Error syncing custom topics from 2025-2026:', error);
      alert('Lỗi khi đồng bộ chủ đề từ năm học 2025-2026.');
    } finally {
      setIsSyncingTopicsFrom2025(false);
    }
  };

  const handleDeleteClass = (cls: ClassRoom) => {
    setConfirmModal({
      isOpen: true,
      title: 'Xác nhận xóa lớp học',
      message: `Bạn có chắc chắn muốn xóa lớp "${cls.name}" (Năm học ${cls.schoolYear || DEFAULT_SCHOOL_YEAR}) không?`,
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'classes', cls.id));
          if (selectedClassFilter === cls.id) setSelectedClassFilter('all');
          if (selectedClassId === cls.id) setSelectedClassId('');
          if (bulkClassId === cls.id) setBulkClassId('');
          if (selectedTopicClassId === cls.id) setSelectedTopicClassId('');
        } catch (err) {
          console.error('Error deleting class:', err);
          alert('Lỗi khi xóa lớp học');
        }
      }
    });
  };

  const handleAddCustomTopic = async () => {
    if (!selectedTopicClassId || !newCustomTopic.trim()) return;
    setIsAddingTopic(true);
    try {
      const selectedClass = classes.find(c => c.id === selectedTopicClassId);
      if (!selectedClass) throw new Error('Không tìm thấy lớp học');

      const currentCustomTopics = selectedClass.customTopics || {};
      const currentSubjectTopics = currentCustomTopics[selectedTopicSubject] || [];
      
      // Split by newlines, clean spaces, and filter empty strings
      const topicsToAdd = newCustomTopic
        .split('\n')
        .map(t => t.trim())
        .filter(t => t.length > 0);

      if (topicsToAdd.length === 0) {
        setIsAddingTopic(false);
        return;
      }

      // Add all input lines directly as topics without filtering duplicates
      const newTopicsList = [...currentSubjectTopics, ...topicsToAdd];

      const updatedCustomTopics = {
        ...currentCustomTopics,
        [selectedTopicSubject]: newTopicsList
      };

      await setDoc(doc(db, 'classes', selectedTopicClassId), {
        customTopics: updatedCustomTopics
      }, { merge: true });

      setNewCustomTopic('');
      alert(`Đã thêm thành công ${topicsToAdd.length} chủ đề!`);
    } catch (error) {
      console.error('Error adding custom topic:', error);
      alert('Lỗi khi thêm chủ đề');
    } finally {
      setIsAddingTopic(false);
    }
  };

  const handleDeleteCustomTopic = (classId: string, subject: Subject, topicToDelete: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Xác nhận xóa chủ đề',
      message: `Bạn có chắc chắn muốn xóa chủ đề "${topicToDelete}" không?`,
      onConfirm: async () => {
        try {
          const selectedClass = classes.find(c => c.id === classId);
          if (!selectedClass) throw new Error('Không tìm thấy lớp học');

          const currentCustomTopics = selectedClass.customTopics || {};
          const currentSubjectTopics = currentCustomTopics[subject] || [];
          const updatedSubjectTopics = currentSubjectTopics.filter(t => t !== topicToDelete);
          
          const updatedCustomTopics = {
            ...currentCustomTopics,
            [subject]: updatedSubjectTopics
          };

          await setDoc(doc(db, 'classes', classId), {
            customTopics: updatedCustomTopics
          }, { merge: true });

        } catch (error) {
          console.error('Error deleting custom topic:', error);
          alert('Lỗi khi xóa chủ đề');
        }
      }
    });
  };

  const handleDeleteAllCustomTopics = () => {
    setConfirmModal({
      isOpen: true,
      title: 'Xóa toàn bộ chủ đề tự tạo',
      message: `Bạn có chắc chắn muốn xóa TOÀN BỘ chủ đề tự tạo của tất cả các lớp học trong Năm học ${selectedSchoolYear} không? Hành động này không thể hoàn tác.`,
      onConfirm: async () => {
        setLoading(true);
        try {
          const classesWithTopics = classesInYear.filter(cls => {
            if (!cls.customTopics) return false;
            return Object.entries(cls.customTopics).some(
              ([_, topics]) => Array.isArray(topics) && topics.length > 0
            );
          });

          if (classesWithTopics.length === 0) {
            alert(`Không có chủ đề tự tạo nào trong Năm học ${selectedSchoolYear} để xóa!`);
            setLoading(false);
            return;
          }

          const promises = classesWithTopics.map(cls => 
            setDoc(doc(db, 'classes', cls.id), {
              customTopics: {}
            }, { merge: true })
          );

          await Promise.all(promises);
          alert(`Đã xóa thành công toàn bộ chủ đề tự tạo của Năm học ${selectedSchoolYear}!`);
        } catch (error) {
          console.error('Error deleting all custom topics:', error);
          alert('Lỗi khi xóa toàn bộ chủ đề');
        } finally {
          setLoading(false);
        }
      }
    });
  };

  const toggleSelectAll = () => {
    if (selectedUserIds.length === filteredUsers.length) {
      setSelectedUserIds([]);
    } else {
      setSelectedUserIds(filteredUsers.filter(u => u.role !== 'admin').map(u => u.uid));
    }
  };

  const toggleSelectUser = (uid: string) => {
    setSelectedUserIds(prev => 
      prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]
    );
  };

  const handleDeleteSelected = () => {
    if (selectedUserIds.length === 0) return;
    setConfirmModal({
      isOpen: true,
      title: 'Xác nhận xóa tài khoản đã chọn',
      message: `Bạn có đồng ý xóa ${selectedUserIds.length} tài khoản đã chọn không?`,
      onConfirm: async () => {
        setLoading(true);
        try {
          const response = await fetch('/api/admin/delete-users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ uids: selectedUserIds }),
          });
          if (response.ok) {
            setUsers(prev => prev.filter(u => !selectedUserIds.includes(u.uid)));
            setSelectedUserIds([]);
            alert('Đã xóa thành công các tài khoản đã chọn!');
          } else {
            console.warn('Server-side bulk deletion failed, using client-side fallback...');
            const promises = selectedUserIds.map(uid => deleteDoc(doc(db, 'users', uid)));
            await Promise.all(promises);
            setUsers(prev => prev.filter(u => !selectedUserIds.includes(u.uid)));
            setSelectedUserIds([]);
            alert('Đã xóa thành công các tài khoản đã chọn (dự phòng)!');
          }
        } catch (error) {
          console.error('Error deleting users, trying client-side fallback:', error);
          try {
            const promises = selectedUserIds.map(uid => deleteDoc(doc(db, 'users', uid)));
            await Promise.all(promises);
            setUsers(prev => prev.filter(u => !selectedUserIds.includes(u.uid)));
            setSelectedUserIds([]);
            alert('Đã xóa thành công các tài khoản đã chọn (dự phòng)!');
          } catch (clientErr) {
            console.error('Client-side fallback also failed:', clientErr);
            alert('Có lỗi xảy ra khi xóa các tài khoản. Vui lòng thử lại!');
          }
        } finally {
          setLoading(false);
        }
      }
    });
  };

  const handleDeleteAll = () => {
    const deletableUsers = usersInYear;
    if (deletableUsers.length === 0) return;
    const uidsToDelete = deletableUsers.map(u => u.uid);
    setConfirmModal({
      isOpen: true,
      title: `Xác nhận xóa tài khoản Năm học ${selectedSchoolYear}`,
      message: `Bạn có đồng ý xóa toàn bộ ${deletableUsers.length} tài khoản người dùng thuộc Năm học ${selectedSchoolYear} không?`,
      onConfirm: async () => {
        setLoading(true);
        try {
          const response = await fetch('/api/admin/delete-users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ uids: uidsToDelete }),
          });
          if (response.ok) {
            setUsers(prev => prev.filter(u => !uidsToDelete.includes(u.uid)));
            setSelectedUserIds([]);
            alert(`Đã xóa tất cả tài khoản Năm học ${selectedSchoolYear} thành công!`);
          } else {
            console.warn('Server-side bulk deletion failed, using client-side fallback...');
            const promises = uidsToDelete.map(uid => deleteDoc(doc(db, 'users', uid)));
            await Promise.all(promises);
            setUsers(prev => prev.filter(u => !uidsToDelete.includes(u.uid)));
            setSelectedUserIds([]);
            alert(`Đã xóa tất cả tài khoản Năm học ${selectedSchoolYear} thành công (dự phòng)!`);
          }
        } catch (error) {
          console.error('Error deleting all users, trying client-side fallback:', error);
          try {
            const promises = uidsToDelete.map(uid => deleteDoc(doc(db, 'users', uid)));
            await Promise.all(promises);
            setUsers(prev => prev.filter(u => !uidsToDelete.includes(u.uid)));
            setSelectedUserIds([]);
            alert(`Đã xóa tất cả tài khoản Năm học ${selectedSchoolYear} thành công (dự phòng)!`);
          } catch (clientErr) {
            console.error('Client-side fallback also failed:', clientErr);
            alert('Có lỗi xảy ra khi xóa các tài khoản. Vui lòng thử lại!');
          }
        } finally {
          setLoading(false);
        }
      }
    });
  };

  const handleResetAllData = () => {
    setConfirmModal({
      isOpen: true,
      title: '⚠️ Reset toàn bộ hệ thống',
      message: 'CẢNH BÁO: Thao tác này sẽ xóa sạch tất cả tài khoản học sinh, giáo viên, bài nộp, đề thi và các lớp học. Bạn có chắc chắn muốn tiến hành reset không?',
      onConfirm: async () => {

    setLoading(true);
    try {
      // 1. Delete all results
      const resultsSnap = await getDocs(collection(db, 'results'));
      const deleteResultsPromises = resultsSnap.docs.map(d => deleteDoc(d.ref));
      await Promise.all(deleteResultsPromises);

      // 2. Delete all assignments
      const assignmentsSnap = await getDocs(collection(db, 'assignments'));
      const deleteAssignmentsPromises = assignmentsSnap.docs.map(d => deleteDoc(d.ref));
      await Promise.all(deleteAssignmentsPromises);

      // 3. Delete all quiz templates
      const templatesSnap = await getDocs(collection(db, 'quiz_templates'));
      const deleteTemplatesPromises = templatesSnap.docs.map(d => deleteDoc(d.ref));
      await Promise.all(deleteTemplatesPromises);

      // 4. Delete all classes
      const classesSnap = await getDocs(collection(db, 'classes'));
      const deleteClassesPromises = classesSnap.docs.map(d => deleteDoc(d.ref));
      await Promise.all(deleteClassesPromises);

      // 5. Delete all non-admin users
      const deletableUsers = users.filter(u => u.role !== 'admin');
      const uids = deletableUsers.map(u => u.uid);
      
      if (uids.length > 0) {
        try {
          await fetch('/api/admin/delete-users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ uids }),
          });
        } catch (e) {
          console.warn('Auth deletion api failed or not present, fallback to firestore cleanup');
        }

        const deleteUserDocsPromises = uids.map(uid => deleteDoc(doc(db, 'users', uid)));
        await Promise.all(deleteUserDocsPromises);
      }

      setSelectedUserIds([]);
      alert('Đã reset toàn bộ tài khoản, dữ liệu, lớp học và lịch sử học tập thành công!');
    } catch (error) {
      console.error('Error resetting system data:', error);
      alert('Có lỗi xảy ra khi thực hiện reset dữ liệu. Vui lòng kiểm tra console!');
    } finally {
      setLoading(false);
    }
      }
    });
  };

  // Automatically migrate any existing @tuanlo.vn accounts in Firestore to @lightedu.vn
  const hasAttemptedDomainMigrationRef = React.useRef(false);
  useEffect(() => {
    if (hasAttemptedDomainMigrationRef.current || users.length === 0) return;
    const legacyUsers = users.filter(u => u.email && /@tuanlo\.vn$/i.test(u.email));
    if (legacyUsers.length === 0) return;
    hasAttemptedDomainMigrationRef.current = true;

    (async () => {
      for (const u of legacyUsers) {
        const updatedEmail = u.email.replace(/@tuanlo\.vn$/i, '@lightedu.vn');
        try {
          await updateDoc(doc(db, 'users', u.uid), { email: updatedEmail });
        } catch (err) {
          console.warn(`Could not migrate email for user ${u.uid}:`, err);
        }
      }
      try {
        await fetch('/api/admin/migrate-email-domain', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            users: legacyUsers.map(u => ({
              uid: u.uid,
              email: u.email.replace(/@tuanlo\.vn$/i, '@lightedu.vn')
            }))
          })
        });
      } catch {
        // Non-blocking best-effort Firebase Auth email sync
      }
    })();
  }, [users]);

  const filterProvinceOptions = useMemo(() => {
    const base = new Set<string>(getProvinces());
    usersInYear.forEach(u => {
      if (u.provinceName?.trim()) base.add(u.provinceName.trim());
    });
    return Array.from(base).sort((a, b) => a.localeCompare(b, 'vi'));
  }, [usersInYear]);

  const filterCommuneOptions = useMemo(() => {
    if (selectedProvinceFilter === 'all') return [];
    const base = new Set<string>(getCommunesByProvince(selectedProvinceFilter));
    usersInYear.forEach(u => {
      if (
        u.provinceName &&
        normalizeViSearch(u.provinceName) === normalizeViSearch(selectedProvinceFilter) &&
        u.communeName?.trim()
      ) {
        base.add(u.communeName.trim());
      }
    });
    return Array.from(base).sort((a, b) => a.localeCompare(b, 'vi'));
  }, [selectedProvinceFilter, usersInYear]);

  const filterSchoolOptions = useMemo(() => {
    if (selectedProvinceFilter === 'all' || selectedCommuneFilter === 'all') return [];
    const base = new Set<string>(getSchoolsByCommune(selectedProvinceFilter, selectedCommuneFilter));
    usersInYear.forEach(u => {
      if (
        u.provinceName &&
        u.communeName &&
        normalizeViSearch(u.provinceName) === normalizeViSearch(selectedProvinceFilter) &&
        normalizeViSearch(u.communeName) === normalizeViSearch(selectedCommuneFilter) &&
        u.schoolName?.trim()
      ) {
        base.add(u.schoolName.trim());
      }
    });
    return Array.from(base).sort((a, b) => a.localeCompare(b, 'vi'));
  }, [selectedProvinceFilter, selectedCommuneFilter, usersInYear]);

  const matchesLocationFilters = (u: UserProfile) => {
    const matchesProvince =
      selectedProvinceFilter === 'all' ||
      (Boolean(u.provinceName) && normalizeViSearch(u.provinceName!) === normalizeViSearch(selectedProvinceFilter));
    const matchesCommune =
      selectedCommuneFilter === 'all' ||
      (Boolean(u.communeName) && normalizeViSearch(u.communeName!) === normalizeViSearch(selectedCommuneFilter));
    const matchesSchool =
      selectedSchoolFilter === 'all' ||
      (Boolean(u.schoolName) && normalizeViSearch(u.schoolName!) === normalizeViSearch(selectedSchoolFilter));
    return matchesProvince && matchesCommune && matchesSchool;
  };

  const filteredUsers = usersInYear.filter(u => {
    const matchesRole = selectedRoleFilter === 'all' || u.role === selectedRoleFilter;
    const matchesClass = selectedClassFilter === 'all' || u.classId === selectedClassFilter;
    const matchesLocation = matchesLocationFilters(u);
    const normalizedEmail = u.email ? u.email.replace(/@tuanlo\.vn$/i, '@lightedu.vn') : '';
    const username = normalizedEmail ? normalizedEmail.replace(/@lightedu\.vn$/i, '') : '';
    const searchNorm = normalizeViSearch(searchTerm);
    const matchesSearch = !searchNorm || (
      normalizeViSearch(normalizedEmail).includes(searchNorm) || 
      (u.displayName && normalizeViSearch(u.displayName).includes(searchNorm)) ||
      normalizeViSearch(username).includes(searchNorm) ||
      (u.classId && normalizeViSearch(u.classId).includes(searchNorm)) ||
      (u.schoolName && normalizeViSearch(u.schoolName).includes(searchNorm)) ||
      (u.communeName && normalizeViSearch(u.communeName).includes(searchNorm)) ||
      (u.provinceName && normalizeViSearch(u.provinceName).includes(searchNorm))
    );
    return matchesRole && matchesClass && matchesLocation && matchesSearch;
  });

  const handleExportStudentAccountsExcel = () => {
    // Export student accounts matching current school year, location, class & search filter
    const studentList = usersInYear.filter(u => {
      if (u.role !== 'student') return false;
      const matchesClass = selectedClassFilter === 'all' || u.classId === selectedClassFilter;
      const matchesLocation = matchesLocationFilters(u);
      const normalizedEmail = u.email ? u.email.replace(/@tuanlo\.vn$/i, '@lightedu.vn') : '';
      const username = normalizedEmail ? normalizedEmail.replace(/@lightedu\.vn$/i, '') : '';
      const searchNorm = normalizeViSearch(searchTerm);
      const matchesSearch = !searchNorm || (
        normalizeViSearch(normalizedEmail).includes(searchNorm) || 
        (u.displayName && normalizeViSearch(u.displayName).includes(searchNorm)) ||
        normalizeViSearch(username).includes(searchNorm) ||
        (u.schoolName && normalizeViSearch(u.schoolName).includes(searchNorm)) ||
        (u.communeName && normalizeViSearch(u.communeName).includes(searchNorm)) ||
        (u.provinceName && normalizeViSearch(u.provinceName).includes(searchNorm))
      );
      return matchesClass && matchesLocation && matchesSearch;
    });

    if (studentList.length === 0) {
      alert(`Không tìm thấy tài khoản học sinh nào trong Năm học ${selectedSchoolYear} để xuất file Excel!`);
      return;
    }

    const data = studentList.map((u, index) => {
      const className = classesInYear.find(c => c.id === u.classId)?.name || classes.find(c => c.id === u.classId)?.name || u.classId || 'Chưa xếp lớp';
      const normalizedEmail = u.email ? u.email.replace(/@tuanlo\.vn$/i, '@lightedu.vn') : '';
      const username = normalizedEmail ? normalizedEmail.replace(/@lightedu\.vn$/i, '') : '---';
      const password = (u as any).password || '123456';
      return {
        'STT': index + 1,
        'Năm học': u.schoolYear || selectedSchoolYear,
        'Họ và tên học sinh': u.displayName || 'Chưa cập nhật',
        'Lớp': className,
        'Tên đăng nhập / Mã HS': username,
        'Email đăng nhập': normalizedEmail || '---',
        'Mật khẩu': password,
        'Trường học': u.schoolName || '---',
        'Xã/Phường': u.communeName || '---',
        'Tỉnh/Thành phố': u.provinceName || '---'
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(data);

    worksheet['!cols'] = [
      { wch: 6 },  // STT
      { wch: 13 }, // Năm học
      { wch: 25 }, // Họ tên
      { wch: 15 }, // Lớp
      { wch: 25 }, // Tên đăng nhập
      { wch: 32 }, // Email
      { wch: 15 }, // Mật khẩu
      { wch: 25 }, // Trường
      { wch: 20 }, // Xã
      { wch: 20 }  // Tỉnh
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Tai_Khoan_Hoc_Sinh");

    const selectedClassName = classesInYear.find(c => c.id === selectedClassFilter)?.name || selectedClassFilter;
    const fileName = selectedClassFilter !== 'all'
      ? `Danh_sach_tai_khoan_hoc_sinh_${selectedSchoolYear}_Lop_${selectedClassName.replace(/\s+/g, '_')}.xlsx`
      : `Danh_sach_tai_khoan_hoc_sinh_${selectedSchoolYear}.xlsx`;

    XLSX.writeFile(workbook, fileName);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 md:py-8 space-y-6 md:space-y-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h2 className="text-xl md:text-2xl font-bold text-stone-900 flex items-center gap-2">
          <Shield className="w-5 h-5 md:w-6 md:h-6 text-red-600" />
          Quản trị hệ thống
        </h2>
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={handleResetAllData}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:bg-rose-400 text-white font-bold text-xs rounded-xl transition-all shadow-sm shadow-rose-100"
          >
            <Trash2 className="w-4 h-4" />
            <span>Reset Hệ Thống (Tài khoản & Dữ liệu)</span>
          </button>
          <div className="text-[10px] font-mono text-stone-400 bg-stone-100 px-3 py-1 rounded-full uppercase tracking-widest">
            Admin Panel
          </div>
        </div>
      </div>

      {/* School Year Selector Bar */}
      <div className="bg-gradient-to-r from-indigo-950 via-slate-900 to-emerald-950 text-white p-5 rounded-3xl shadow-xl border border-indigo-900/40 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-amber-400/20 border border-amber-400/30 flex items-center justify-center text-amber-300 shrink-0">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-mono uppercase tracking-widest text-amber-300 font-bold">Quản lý theo năm học</p>
            <h3 className="text-base sm:text-lg font-extrabold text-white mt-0.5">
              Năm học đang chọn: <span className="text-amber-300">{selectedSchoolYear}</span>
            </h3>
            <p className="text-xs text-stone-300 mt-0.5">
              Toàn bộ lớp học, tài khoản giáo viên và học sinh chỉ hiển thị đúng theo năm học đang chọn.
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center gap-2">
            <select
              value={selectedSchoolYear}
              onChange={(e) => handleChangeSchoolYear(e.target.value)}
              className="px-4 py-2.5 rounded-xl bg-white text-stone-900 font-extrabold text-sm outline-none focus:ring-2 focus:ring-amber-400 shadow-md cursor-pointer min-w-[175px]"
              aria-label="Chọn năm học"
            >
              {availableSchoolYears.map(year => (
                <option key={year} value={year}>
                  Năm học {year}
                </option>
              ))}
            </select>

            {!isAddingSchoolYear ? (
              <button
                type="button"
                onClick={() => setIsAddingSchoolYear(true)}
                className="px-3 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
                title="Thêm năm học mới"
              >
                <Plus className="w-4 h-4 text-amber-300" />
                <span>Thêm năm học</span>
              </button>
            ) : (
              <div className="flex items-center gap-1.5 bg-white/10 p-1 rounded-xl border border-white/20">
                <input
                  type="text"
                  placeholder="2030-2031"
                  value={newSchoolYearInput}
                  onChange={(e) => setNewSchoolYearInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddSchoolYear();
                    }
                  }}
                  className="w-28 px-2.5 py-1.5 rounded-lg bg-white text-stone-900 text-xs font-bold outline-none"
                />
                <button
                  type="button"
                  onClick={handleAddSchoolYear}
                  className="px-2.5 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-stone-950 text-xs font-extrabold cursor-pointer"
                >
                  Lưu
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingSchoolYear(false);
                    setNewSchoolYearInput('');
                  }}
                  className="p-1.5 text-stone-300 hover:text-white cursor-pointer"
                  title="Hủy"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="px-3 py-1.5 rounded-xl bg-purple-500/20 border border-purple-400/30 text-purple-200 font-bold">
              {classesInYear.length} lớp học
            </span>
            <span className="px-3 py-1.5 rounded-xl bg-blue-500/20 border border-blue-400/30 text-blue-200 font-bold">
              {teacherCountInYear} giáo viên
            </span>
            <span className="px-3 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-400/30 text-emerald-200 font-bold">
              {studentCountInYear} học sinh
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
        {/* Create User Form */}
        <div className="lg:col-span-1 space-y-6 md:space-y-8">
          {/* Create Class Form & Class List for Selected School Year */}
          <div className="bg-white p-5 md:p-6 rounded-2xl border border-stone-200 shadow-sm space-y-5">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-base md:text-lg font-bold text-stone-900 flex items-center gap-2">
                <School className="w-4 h-4 md:w-5 md:h-5 text-purple-600" />
                Lớp học
              </h3>
              <span className="text-[10px] font-mono font-bold px-2.5 py-1 rounded-full bg-purple-50 text-purple-700 border border-purple-100">
                NH {selectedSchoolYear}
              </span>
            </div>
            <form onSubmit={handleCreateClass} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-mono uppercase tracking-widest text-stone-400 ml-2">Tên lớp học mới</label>
                <input 
                  type="text" 
                  placeholder="Ví dụ: Lớp 5A1"
                  value={newClassName}
                  onChange={(e) => setNewClassName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-stone-200 text-sm outline-none focus:ring-2 focus:ring-purple-500"
                  required
                />
              </div>
              <button 
                type="submit"
                disabled={isCreatingClass}
                className="w-full py-3 bg-purple-600 text-white font-bold rounded-xl hover:bg-purple-700 disabled:bg-stone-200 transition-all flex items-center justify-center gap-2 shadow-md cursor-pointer"
              >
                {isCreatingClass ? <Loader2 className="w-4 h-4 animate-spin" /> : <School className="w-4 h-4" />}
                Tạo lớp học ({selectedSchoolYear})
              </button>
            </form>

            {/* List of Created Classes in Selected School Year */}
            <div className="pt-4 border-t border-stone-100 space-y-2.5">
              <p className="text-[10px] font-mono uppercase tracking-widest text-stone-500 font-bold">
                Danh sách lớp Năm học {selectedSchoolYear} ({classesInYear.length})
              </p>
              {classesInYear.length === 0 ? (
                <div className="p-4 rounded-xl bg-stone-50 border border-dashed border-stone-200 text-center">
                  <p className="text-xs text-stone-400 italic">
                    Chưa có lớp học nào trong Năm học {selectedSchoolYear}.
                  </p>
                </div>
              ) : (
                <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                  {classesInYear.map(cls => {
                    const studentsInCls = usersInYear.filter(u => u.role === 'student' && u.classId === cls.id).length;
                    return (
                      <div
                        key={cls.id}
                        className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-purple-50/40 border border-purple-100 text-xs"
                      >
                        <div className="min-w-0">
                          <p className="font-bold text-stone-900 truncate">{cls.name}</p>
                          <p className="text-[10px] text-stone-500 font-mono">
                            Mã: {cls.id} • {studentsInCls} HS
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteClass(cls)}
                          className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors shrink-0 cursor-pointer"
                          title="Xóa lớp học"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="bg-white p-5 md:p-6 rounded-2xl border border-stone-200 shadow-sm">
            <div className="flex items-center justify-between gap-2 mb-4 md:mb-6">
              <h3 className="text-base md:text-lg font-bold text-stone-900 flex items-center gap-2">
                <UserPlus className="w-4 h-4 md:w-5 md:h-5 text-emerald-600" />
                Cấp tài khoản mới
              </h3>
              <span className="text-[10px] font-mono font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
                NH {selectedSchoolYear}
              </span>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setRole('student')}
                  className={`flex items-center justify-center gap-2 p-3 rounded-xl border transition-all text-[10px] md:text-xs font-bold ${role === 'student' ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : 'bg-white border-stone-100 text-stone-400'}`}
                >
                  <GraduationCap className="w-4 h-4" />
                  Học sinh
                </button>
                <button
                  type="button"
                  onClick={() => setRole('teacher')}
                  className={`flex items-center justify-center gap-2 p-3 rounded-xl border transition-all text-[10px] md:text-xs font-bold ${role === 'teacher' ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-white border-stone-100 text-stone-400'}`}
                >
                  <UserCheck className="w-4 h-4" />
                  Giáo viên
                </button>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-mono uppercase tracking-widest text-stone-400 ml-2">Họ và tên</label>
                <div className="relative">
                  <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-300" />
                  <input 
                    type="text" 
                    placeholder="Nguyễn Văn A"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-stone-200 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                    required
                  />
                </div>
              </div>

              {role === 'student' && (
                <>
                  <div className="space-y-1">
                    <label className="text-[10px] font-mono uppercase tracking-widest text-stone-400 ml-2">Lớp học</label>
                    <div className="relative">
                      <School className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-300" />
                      <select 
                        value={selectedClassId}
                        onChange={(e) => setSelectedClassId(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-stone-200 text-sm outline-none focus:ring-2 focus:ring-emerald-500 appearance-none bg-white"
                        required
                      >
                        <option value="">-- Chọn lớp ({selectedSchoolYear}) --</option>
                        {classesInYear.map(cls => (
                          <option key={cls.id} value={cls.id}>{cls.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <LocationSchoolSelector
                    provinceName={provinceName}
                    communeName={communeName}
                    schoolName={schoolName}
                    onProvinceChange={setProvinceName}
                    onCommuneChange={setCommuneName}
                    onSchoolChange={setSchoolName}
                    required={true}
                    accent="emerald"
                  />

                  <div className="space-y-2 border border-stone-100 p-3 rounded-xl bg-stone-50">
                    <label className="text-[10px] font-mono uppercase tracking-widest text-stone-400 block mb-1">
                      Chủ đề khối lớp khác (Tùy chọn thêm)
                    </label>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {['Lớp 1', 'Lớp 2', 'Lớp 3', 'Lớp 4', 'Lớp 5'].map(g => (
                        <label key={g} className="flex items-center gap-2 cursor-pointer select-none text-stone-700">
                          <input 
                            type="checkbox"
                            checked={selectedGrades.includes(g)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedGrades([...selectedGrades, g]);
                              } else {
                                setSelectedGrades(selectedGrades.filter(x => x !== g));
                              }
                            }}
                            className="rounded border-stone-300 text-emerald-600 focus:ring-emerald-500"
                          />
                          {g}
                        </label>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {role === 'teacher' && (
                <div className="space-y-4">
                  {/* Địa bàn công tác (Tùy chọn) */}
                  <div className="space-y-3 border border-stone-100 p-3.5 rounded-xl bg-stone-50/70">
                    <p className="text-[10px] font-mono uppercase tracking-widest text-stone-500 font-bold">
                      Đơn vị công tác (Tùy chọn)
                    </p>
                    <LocationSchoolSelector
                      provinceName={provinceName}
                      communeName={communeName}
                      schoolName={schoolName}
                      onProvinceChange={setProvinceName}
                      onCommuneChange={setCommuneName}
                      onSchoolChange={setSchoolName}
                      required={false}
                      accent="blue"
                    />
                  </div>
                  {/* Phân công môn dạy */}
                  <div className="space-y-2 border border-stone-100 p-3.5 rounded-xl bg-stone-50">
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[10px] font-mono uppercase tracking-widest text-stone-500 font-bold block">
                        Phân công môn dạy (Tích chọn)
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          if (selectedTeacherSubjects.length === SUBJECTS.length) {
                            setSelectedTeacherSubjects([]);
                          } else {
                            setSelectedTeacherSubjects([...SUBJECTS]);
                          }
                        }}
                        className="text-[10px] text-blue-600 font-bold hover:underline"
                      >
                        {selectedTeacherSubjects.length === SUBJECTS.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs max-h-48 overflow-y-auto p-1">
                      {SUBJECTS.map(subj => (
                        <label key={subj} className="flex items-center gap-2 cursor-pointer select-none text-stone-700 hover:text-stone-900 bg-white p-2 rounded-lg border border-stone-200 shadow-sm">
                          <input 
                            type="checkbox"
                            checked={selectedTeacherSubjects.includes(subj)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedTeacherSubjects([...selectedTeacherSubjects, subj]);
                              } else {
                                setSelectedTeacherSubjects(selectedTeacherSubjects.filter(x => x !== subj));
                              }
                            }}
                            className="rounded border-stone-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="font-medium text-stone-800 text-[11px]">{subj}</span>
                        </label>
                      ))}
                    </div>
                    <p className="text-[9px] text-stone-400 italic">Nếu không chọn môn nào, giáo viên sẽ mặc định xem được tất cả môn học.</p>
                  </div>

                  {/* Phân công lớp dạy */}
                  <div className="space-y-2 border border-stone-100 p-3.5 rounded-xl bg-stone-50">
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[10px] font-mono uppercase tracking-widest text-stone-500 font-bold block">
                        Phân công lớp dạy ({classesInYear.length} lớp • {selectedSchoolYear})
                      </label>
                      {classesInYear.length > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            if (selectedTeacherClassIds.length === classesInYear.length) {
                              setSelectedTeacherClassIds([]);
                            } else {
                              setSelectedTeacherClassIds(classesInYear.map(c => c.id));
                            }
                          }}
                          className="text-[10px] text-blue-600 font-bold hover:underline"
                        >
                          {selectedTeacherClassIds.length === classesInYear.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
                        </button>
                      )}
                    </div>
                    {classesInYear.length === 0 ? (
                      <p className="text-[11px] text-amber-600 italic">Chưa có lớp nào trong Năm học {selectedSchoolYear}. Hãy tạo lớp học trước.</p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs max-h-48 overflow-y-auto p-1">
                        {classesInYear.map(cls => (
                          <label key={cls.id} className="flex items-center gap-2 cursor-pointer select-none text-stone-700 hover:text-stone-900 bg-white p-2 rounded-lg border border-stone-200 shadow-sm">
                            <input 
                              type="checkbox"
                              checked={selectedTeacherClassIds.includes(cls.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedTeacherClassIds([...selectedTeacherClassIds, cls.id]);
                                } else {
                                  setSelectedTeacherClassIds(selectedTeacherClassIds.filter(x => x !== cls.id));
                                }
                              }}
                              className="rounded border-stone-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="font-medium text-stone-800 text-[11px]">{cls.name}</span>
                          </label>
                        ))}
                      </div>
                    )}
                    <p className="text-[9px] text-stone-400 italic">Nếu không chọn lớp nào, giáo viên sẽ xem được tất cả các lớp trong năm học này.</p>
                  </div>
                </div>
              )}

              <p className="text-[9px] text-stone-400 ml-2 italic">* Tài khoản & mật khẩu 123456 sẽ tự sinh</p>

              {error && <p className="text-red-500 text-[10px] text-center font-bold">{error}</p>}

              <button 
                type="submit"
                disabled={isCreating}
                className="w-full py-4 bg-stone-900 text-white font-bold rounded-xl hover:bg-stone-800 disabled:bg-stone-200 transition-all flex items-center justify-center gap-2 shadow-lg"
              >
                {isCreating ? <Loader2 className="w-5 h-5 animate-spin" /> : <UserPlus className="w-5 h-5" />}
                Tạo tài khoản
              </button>
            </form>
          </div>

          {/* Bulk Create Tool */}
          <div className="bg-white p-5 md:p-6 rounded-2xl border border-stone-200 shadow-sm">
            <div className="flex items-center justify-between gap-2 mb-4 md:mb-6">
              <h3 className="text-base md:text-lg font-bold text-stone-900 flex items-center gap-2">
                <FileText className="w-4 h-4 md:w-5 md:h-5 text-blue-600" />
                Cấp tài khoản hàng loạt
              </h3>
              <span className="text-[10px] font-mono font-bold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                NH {selectedSchoolYear}
              </span>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setBulkRole('student')}
                  className={`flex items-center justify-center gap-2 p-3 rounded-xl border transition-all text-[10px] md:text-xs font-bold ${bulkRole === 'student' ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : 'bg-white border-stone-100 text-stone-400'}`}
                >
                  <GraduationCap className="w-4 h-4" />
                  Học sinh
                </button>
                <button
                  type="button"
                  onClick={() => setBulkRole('teacher')}
                  className={`flex items-center justify-center gap-2 p-3 rounded-xl border transition-all text-[10px] md:text-xs font-bold ${bulkRole === 'teacher' ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-white border-stone-100 text-stone-400'}`}
                >
                  <UserCheck className="w-4 h-4" />
                  Giáo viên
                </button>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-mono uppercase tracking-widest text-stone-400 ml-2">Danh sách họ tên (mỗi dòng 1 tên)</label>
                <textarea 
                  rows={5}
                  placeholder="Nguyễn Văn A&#10;Trần Thị B&#10;Lê Văn C"
                  value={bulkNames}
                  onChange={(e) => setBulkNames(e.target.value)}
                  className="w-full p-4 rounded-xl border border-stone-200 text-sm outline-none focus:ring-2 focus:ring-blue-500 font-sans leading-relaxed"
                />
              </div>

              {bulkRole === 'student' && (
                <>
                  <div className="space-y-1">
                    <label className="text-[10px] font-mono uppercase tracking-widest text-stone-400 ml-2">Lớp học cho danh sách này</label>
                    <div className="relative">
                      <School className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-300" />
                      <select 
                        value={bulkClassId}
                        onChange={(e) => setBulkClassId(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-stone-200 text-sm outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white"
                        required
                      >
                        <option value="">-- Chọn lớp ({selectedSchoolYear}) --</option>
                        {classesInYear.map(cls => (
                          <option key={cls.id} value={cls.id}>{cls.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <LocationSchoolSelector
                    provinceName={bulkProvinceName}
                    communeName={bulkCommuneName}
                    schoolName={bulkSchoolName}
                    onProvinceChange={setBulkProvinceName}
                    onCommuneChange={setBulkCommuneName}
                    onSchoolChange={setBulkSchoolName}
                    required={true}
                    accent="blue"
                  />

                  <div className="space-y-2 border border-stone-100 p-3 rounded-xl bg-stone-50">
                    <label className="text-[10px] font-mono uppercase tracking-widest text-stone-400 block mb-1">
                      Chủ đề khối lớp khác (Tùy chọn thêm)
                    </label>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {['Lớp 1', 'Lớp 2', 'Lớp 3', 'Lớp 4', 'Lớp 5'].map(g => (
                        <label key={g} className="flex items-center gap-2 cursor-pointer select-none text-stone-700">
                          <input 
                            type="checkbox"
                            checked={bulkSelectedGrades.includes(g)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setBulkSelectedGrades([...bulkSelectedGrades, g]);
                              } else {
                                setBulkSelectedGrades(bulkSelectedGrades.filter(x => x !== g));
                              }
                            }}
                            className="rounded border-stone-300 text-blue-600 focus:ring-blue-500"
                          />
                          {g}
                        </label>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {bulkRole === 'teacher' && (
                <div className="space-y-4">
                  {/* Địa bàn công tác (Tùy chọn) */}
                  <div className="space-y-3 border border-stone-100 p-3.5 rounded-xl bg-stone-50/70">
                    <p className="text-[10px] font-mono uppercase tracking-widest text-stone-500 font-bold">
                      Đơn vị công tác (Tùy chọn)
                    </p>
                    <LocationSchoolSelector
                      provinceName={bulkProvinceName}
                      communeName={bulkCommuneName}
                      schoolName={bulkSchoolName}
                      onProvinceChange={setBulkProvinceName}
                      onCommuneChange={setBulkCommuneName}
                      onSchoolChange={setBulkSchoolName}
                      required={false}
                      accent="blue"
                    />
                  </div>
                  {/* Phân công môn dạy */}
                  <div className="space-y-2 border border-stone-100 p-3.5 rounded-xl bg-stone-50">
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[10px] font-mono uppercase tracking-widest text-stone-500 font-bold block">
                        Phân công môn dạy cho các giáo viên này
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          if (bulkSelectedTeacherSubjects.length === SUBJECTS.length) {
                            setBulkSelectedTeacherSubjects([]);
                          } else {
                            setBulkSelectedTeacherSubjects([...SUBJECTS]);
                          }
                        }}
                        className="text-[10px] text-blue-600 font-bold hover:underline"
                      >
                        {bulkSelectedTeacherSubjects.length === SUBJECTS.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs max-h-48 overflow-y-auto p-1">
                      {SUBJECTS.map(subj => (
                        <label key={subj} className="flex items-center gap-2 cursor-pointer select-none text-stone-700 hover:text-stone-900 bg-white p-2 rounded-lg border border-stone-200 shadow-sm">
                          <input 
                            type="checkbox"
                            checked={bulkSelectedTeacherSubjects.includes(subj)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setBulkSelectedTeacherSubjects([...bulkSelectedTeacherSubjects, subj]);
                              } else {
                                setBulkSelectedTeacherSubjects(bulkSelectedTeacherSubjects.filter(x => x !== subj));
                              }
                            }}
                            className="rounded border-stone-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="font-medium text-stone-800 text-[11px]">{subj}</span>
                        </label>
                      ))}
                    </div>
                    <p className="text-[9px] text-stone-400 italic">Nếu không chọn môn nào, giáo viên sẽ mặc định xem được tất cả môn học.</p>
                  </div>

                  {/* Phân công lớp dạy */}
                  <div className="space-y-2 border border-stone-100 p-3.5 rounded-xl bg-stone-50">
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[10px] font-mono uppercase tracking-widest text-stone-500 font-bold block">
                        Phân công lớp dạy ({classesInYear.length} lớp • {selectedSchoolYear})
                      </label>
                      {classesInYear.length > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            if (bulkSelectedTeacherClassIds.length === classesInYear.length) {
                              setBulkSelectedTeacherClassIds([]);
                            } else {
                              setBulkSelectedTeacherClassIds(classesInYear.map(c => c.id));
                            }
                          }}
                          className="text-[10px] text-blue-600 font-bold hover:underline"
                        >
                          {bulkSelectedTeacherClassIds.length === classesInYear.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
                        </button>
                      )}
                    </div>
                    {classesInYear.length === 0 ? (
                      <p className="text-[11px] text-amber-600 italic">Chưa có lớp nào trong Năm học {selectedSchoolYear}. Hãy tạo lớp học trước.</p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs max-h-48 overflow-y-auto p-1">
                        {classesInYear.map(cls => (
                          <label key={cls.id} className="flex items-center gap-2 cursor-pointer select-none text-stone-700 hover:text-stone-900 bg-white p-2 rounded-lg border border-stone-200 shadow-sm">
                            <input 
                              type="checkbox"
                              checked={bulkSelectedTeacherClassIds.includes(cls.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setBulkSelectedTeacherClassIds([...bulkSelectedTeacherClassIds, cls.id]);
                                } else {
                                  setBulkSelectedTeacherClassIds(bulkSelectedTeacherClassIds.filter(x => x !== cls.id));
                                }
                              }}
                              className="rounded border-stone-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="font-medium text-stone-800 text-[11px]">{cls.name}</span>
                          </label>
                        ))}
                      </div>
                    )}
                    <p className="text-[9px] text-stone-400 italic">Nếu không chọn lớp nào, giáo viên sẽ xem được tất cả các lớp trong năm học này.</p>
                  </div>
                </div>
              )}

              <button 
                onClick={handleBulkCreate}
                disabled={isBulkCreating || !bulkNames.trim()}
                className="w-full py-4 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 disabled:bg-stone-200 transition-all flex items-center justify-center gap-2 shadow-lg"
              >
                {isBulkCreating ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileText className="w-5 h-5" />}
                Tạo hàng loạt
              </button>

              {bulkResults.length > 0 && (
                <div className="mt-4 p-4 bg-stone-50 rounded-xl border border-stone-100 max-h-48 overflow-y-auto space-y-2">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">Kết quả tạo:</p>
                    <button 
                      onClick={downloadResults}
                      className="text-[10px] font-bold text-blue-600 flex items-center gap-1 hover:underline"
                    >
                      <Download className="w-3 h-3" />
                      Tải danh sách (.csv)
                    </button>
                  </div>
                  {bulkResults.map((res, idx) => (
                    <div key={idx} className="flex items-center justify-between text-[11px]">
                      <span className="text-stone-600 truncate max-w-[120px]">{res.name}</span>
                      {res.status === 'success' ? (
                        <span className="text-emerald-600 flex items-center gap-1 font-mono">
                          <CheckCircle2 className="w-3 h-3" />
                          {res.email?.split('@')[0]}
                        </span>
                      ) : (
                        <span className="text-red-500 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          Lỗi
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Custom Topics Management */}
          <div className="bg-white p-5 md:p-6 rounded-2xl border border-stone-200 shadow-sm">
            <h3 className="text-base md:text-lg font-bold text-stone-900 mb-4 md:mb-6 flex items-center gap-2">
              <BookOpenCheck className="w-4 h-4 md:w-5 md:h-5 text-indigo-600" />
              Thêm chủ đề cho lớp
            </h3>

            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-mono uppercase tracking-widest text-stone-400 ml-2">Chọn lớp học</label>
                <div className="relative">
                  <School className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-300" />
                  <select 
                    value={selectedTopicClassId}
                    onChange={(e) => {
                      setSelectedTopicClassId(e.target.value);
                    }}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-stone-200 text-sm outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  >
                    <option value="">-- Chọn lớp học ({selectedSchoolYear}) --</option>
                    {classesInYear.map(cls => (
                      <option key={cls.id} value={cls.id}>{cls.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {selectedTopicClassId && (
                <>
                  <div className="space-y-1">
                    <label className="text-[10px] font-mono uppercase tracking-widest text-stone-400 ml-2">Môn học</label>
                    <select 
                      value={selectedTopicSubject}
                      onChange={(e) => setSelectedTopicSubject(e.target.value as Subject)}
                      className="w-full px-4 py-3 rounded-xl border border-stone-200 text-sm outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                    >
                      {SUBJECTS.map(subj => (
                        <option key={subj} value={subj}>{subj}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-mono uppercase tracking-widest text-stone-400 ml-2">Các chủ đề muốn thêm (Mỗi dòng là một chủ đề)</label>
                    <div className="flex flex-col gap-2">
                      <textarea 
                        rows={4}
                        placeholder={"Ví dụ:\nPhép nhân phân số nâng cao\nPhép chia phân số nâng cao\nGiải toán có lời văn"}
                        value={newCustomTopic}
                        onChange={(e) => setNewCustomTopic(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-stone-200 text-sm outline-none focus:ring-2 focus:ring-indigo-500 font-sans resize-y min-h-[100px]"
                      />
                      <button
                        type="button"
                        onClick={handleAddCustomTopic}
                        disabled={isAddingTopic || !newCustomTopic.trim()}
                        className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs disabled:bg-stone-200 transition-all flex items-center justify-center gap-1 shadow-sm"
                      >
                        {isAddingTopic ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Thêm các chủ đề'}
                      </button>
                    </div>
                  </div>

                  {/* Render existing custom topics for selected class and subject */}
                  <div className="border-t border-stone-100 pt-4 space-y-2">
                    <p className="text-[10px] font-mono uppercase tracking-widest text-stone-400 ml-2">Chủ đề tự thêm của lớp:</p>
                    {(() => {
                      const selectedClass = classes.find(c => c.id === selectedTopicClassId);
                      const currentCustomTopics = selectedClass?.customTopics?.[selectedTopicSubject] || [];
                      
                      if (currentCustomTopics.length === 0) {
                        return <p className="text-xs text-stone-400 italic ml-2">Chưa có chủ đề tự thêm nào cho môn này.</p>;
                      }

                      return (
                        <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                          {currentCustomTopics.map((topic, index) => (
                            <div key={index} className="flex items-center justify-between p-2.5 bg-stone-50 rounded-lg border border-stone-100 text-xs text-stone-700 font-medium">
                              <span className="truncate flex-1 pr-2">{topic}</span>
                              <button
                                type="button"
                                onClick={() => handleDeleteCustomTopic(selectedTopicClassId, selectedTopicSubject, topic)}
                                className="text-stone-400 hover:text-red-500 transition-colors p-1"
                                title="Xóa chủ đề này"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* User List */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-4 md:p-8 rounded-2xl border border-stone-200 shadow-sm">
            <div className="flex flex-col gap-4 mb-6 md:mb-8">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <h3 className="text-base md:text-lg font-bold text-stone-900 flex items-center gap-2 flex-wrap">
                    <Users className="w-4 h-4 md:w-5 md:h-5 text-blue-600" />
                    <span>Danh sách tài khoản ({filteredUsers.length}/{usersInYear.length})</span>
                    <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                      Năm học {selectedSchoolYear}
                    </span>
                  </h3>
                  {selectedUserIds.length > 0 && (
                    <p className="text-[10px] font-bold text-blue-600 animate-pulse">
                      Đã chọn {selectedUserIds.length} tài khoản
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button 
                    onClick={handleExportStudentAccountsExcel}
                    className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 transition-all shadow-sm"
                    title="Xuất danh sách tài khoản và mật khẩu học sinh ra file Excel"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Xuất Excel học sinh</span>
                  </button>
                  {selectedUserIds.length > 0 && (
                    <button 
                      onClick={handleDeleteSelected}
                      className="flex items-center gap-2 px-3 py-2 bg-red-50 text-red-600 rounded-lg text-[10px] font-bold hover:bg-red-100 transition-all"
                    >
                      <Trash2 className="w-3 h-3" />
                      Xóa đã chọn
                    </button>
                  )}
                  <button 
                    onClick={handleDeleteAll}
                    disabled={usersInYear.length === 0}
                    className="flex items-center gap-2 px-3 py-2 bg-stone-900 text-white rounded-lg text-[10px] font-bold hover:bg-stone-800 disabled:bg-stone-300 transition-all"
                  >
                    <Trash2 className="w-3 h-3" />
                    Xóa tất cả ({selectedSchoolYear})
                  </button>
                </div>
              </div>

              {/* Filter Controls Bar */}
              <div className="space-y-2.5 pt-3 border-t border-stone-100">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-stone-600">
                    <span>Lọc theo lớp:</span>
                    <select
                      value={selectedClassFilter}
                      onChange={(e) => setSelectedClassFilter(e.target.value)}
                      className="px-3 py-1.5 rounded-lg border border-stone-200 text-xs font-bold bg-white outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="all">-- Tất cả các lớp ({classesInYear.length}) --</option>
                      {classesInYear.map(cls => (
                        <option key={cls.id} value={cls.id}>{cls.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs font-bold text-stone-600">
                    <span>Vai trò:</span>
                    <select
                      value={selectedRoleFilter}
                      onChange={(e) => setSelectedRoleFilter(e.target.value as any)}
                      className="px-3 py-1.5 rounded-lg border border-stone-200 text-xs font-bold bg-white outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="all">Tất cả vai trò</option>
                      <option value="student">Học sinh</option>
                      <option value="teacher">Giáo viên</option>
                    </select>
                  </div>

                  <div className="relative flex-1 min-w-[180px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-400" />
                    <input 
                      type="text" 
                      placeholder="Tìm tên, TK, trường, xã..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9 pr-3 py-1.5 rounded-lg border border-stone-200 text-xs outline-none focus:ring-2 focus:ring-emerald-500 w-full bg-white"
                    />
                  </div>
                </div>

                {/* Cascading Location Filter: Tỉnh -> Xã/Phường -> Trường */}
                <div className="flex flex-wrap items-center gap-2 bg-stone-50/80 p-2.5 rounded-xl border border-stone-100">
                  <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-stone-500 flex items-center gap-1 mr-1">
                    <MapPin className="w-3 h-3 text-emerald-600" />
                    Địa bàn:
                  </span>
                  <select
                    value={selectedProvinceFilter}
                    onChange={(e) => {
                      setSelectedProvinceFilter(e.target.value);
                      setSelectedCommuneFilter('all');
                      setSelectedSchoolFilter('all');
                    }}
                    className="px-2.5 py-1.5 rounded-lg border border-stone-200 text-xs font-semibold bg-white outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="all">-- Tất cả tỉnh --</option>
                    {filterProvinceOptions.map(prov => (
                      <option key={prov} value={prov}>{prov}</option>
                    ))}
                  </select>

                  <select
                    value={selectedCommuneFilter}
                    onChange={(e) => {
                      setSelectedCommuneFilter(e.target.value);
                      setSelectedSchoolFilter('all');
                    }}
                    disabled={selectedProvinceFilter === 'all'}
                    className="px-2.5 py-1.5 rounded-lg border border-stone-200 text-xs font-semibold bg-white outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-stone-100 disabled:text-stone-400 max-w-[200px]"
                  >
                    <option value="all">
                      {selectedProvinceFilter === 'all'
                        ? '-- Chọn tỉnh trước --'
                        : `-- Tất cả xã/phường (${filterCommuneOptions.length}) --`}
                    </option>
                    {filterCommuneOptions.map(comm => (
                      <option key={comm} value={comm}>{comm}</option>
                    ))}
                  </select>

                  <select
                    value={selectedSchoolFilter}
                    onChange={(e) => setSelectedSchoolFilter(e.target.value)}
                    disabled={selectedCommuneFilter === 'all'}
                    className="px-2.5 py-1.5 rounded-lg border border-stone-200 text-xs font-semibold bg-white outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-stone-100 disabled:text-stone-400 flex-1 min-w-[180px] max-w-[280px]"
                  >
                    <option value="all">
                      {selectedCommuneFilter === 'all'
                        ? '-- Chọn xã/phường trước --'
                        : `-- Tất cả trường (${filterSchoolOptions.length}) --`}
                    </option>
                    {filterSchoolOptions.map(sch => (
                      <option key={sch} value={sch}>{sch}</option>
                    ))}
                  </select>

                  {(selectedProvinceFilter !== 'all' || selectedCommuneFilter !== 'all' || selectedSchoolFilter !== 'all') && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedProvinceFilter('all');
                        setSelectedCommuneFilter('all');
                        setSelectedSchoolFilter('all');
                      }}
                      className="text-[11px] font-bold text-stone-500 hover:text-red-600 px-2 py-1 rounded-lg hover:bg-white transition-colors"
                    >
                      Xóa lọc
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="overflow-x-auto no-scrollbar">
              <table className="w-full text-left min-w-[500px]">
                <thead>
                  <tr className="border-b border-stone-100">
                    <th className="pb-4 w-10">
                      <input 
                        type="checkbox"
                        checked={selectedUserIds.length === filteredUsers.filter(u => u.role !== 'admin').length && filteredUsers.length > 0}
                        onChange={toggleSelectAll}
                        className="w-4 h-4 rounded border-stone-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                      />
                    </th>
                    <th className="pb-4 text-[9px] md:text-[10px] font-mono uppercase tracking-widest text-stone-400">Người dùng</th>
                    <th className="pb-4 text-[9px] md:text-[10px] font-mono uppercase tracking-widest text-stone-400">Vai trò</th>
                    <th className="pb-4 text-[9px] md:text-[10px] font-mono uppercase tracking-widest text-stone-400">Lớp & Địa bàn</th>
                    <th className="pb-4 text-[9px] md:text-[10px] font-mono uppercase tracking-widest text-stone-400">Chủ đề được học</th>
                    <th className="pb-4 text-right"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-50">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto text-stone-300" />
                      </td>
                    </tr>
                  ) : filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-10 text-center text-stone-400 italic text-sm">
                        {usersInYear.length === 0
                          ? `Chưa có tài khoản giáo viên hoặc học sinh nào trong Năm học ${selectedSchoolYear}.`
                          : 'Không tìm thấy người dùng nào phù hợp bộ lọc.'}
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u) => (
                      <tr key={u.uid} className={`group hover:bg-stone-50 transition-colors ${selectedUserIds.includes(u.uid) ? 'bg-emerald-50/50' : ''}`}>
                        <td className="py-4">
                          {u.role !== 'admin' && (
                            <input 
                              type="checkbox"
                              checked={selectedUserIds.includes(u.uid)}
                              onChange={() => toggleSelectUser(u.uid)}
                              className="w-4 h-4 rounded border-stone-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                            />
                          )}
                        </td>
                        <td className="py-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-7 h-7 md:w-8 md:h-8 rounded-full flex items-center justify-center text-[10px] md:text-xs font-bold ${u.role === 'teacher' ? 'bg-blue-100 text-blue-600' : 'bg-emerald-100 text-emerald-600'}`}>
                              {u.displayName?.charAt(0) || u.email.charAt(0)}
                            </div>
                            <div>
                              <p className="text-xs md:text-sm font-bold text-stone-900">{u.displayName}</p>
                              <div className="flex flex-wrap items-center gap-1.5 text-[10px] md:text-xs text-stone-500 font-mono mt-0.5">
                                <span>TK: {u.email.replace(/@(lightedu|tuanlo)\.vn$/i, '')}</span>
                                <span className="text-stone-300">•</span>
                                <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-sans font-bold flex items-center gap-1" title="Mật khẩu">
                                  <Key className="w-2.5 h-2.5 text-emerald-600" />
                                  {(u as any).password || '123456'}
                                </span>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-4">
                          <span className={`text-[9px] md:text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-tighter ${u.role === 'teacher' ? 'bg-blue-50 text-blue-600' : u.role === 'admin' ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>
                            {u.role === 'teacher' ? 'Giáo viên' : u.role === 'admin' ? 'Admin' : 'Học sinh'}
                          </span>
                        </td>
                        <td className="py-4">
                          <div className="text-xs">
                            <p className="font-bold text-stone-700">
                              {u.classId ? (classes.find(c => c.id === u.classId)?.name || u.classId) : '---'}
                            </p>
                            {(u.schoolName || u.communeName || u.provinceName) && (
                              <p
                                className="text-[10px] text-stone-400 truncate max-w-[180px]"
                                title={[u.provinceName, u.communeName, u.schoolName].filter(Boolean).join(' • ')}
                              >
                                {[u.schoolName, u.communeName, u.provinceName].filter(Boolean).join(', ')}
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="py-4">
                          <div className="flex flex-wrap gap-1 max-w-[180px]">
                            {u.role === 'student' && (u.allowedGrades || []).map(g => (
                              <span key={g} className="text-[9px] bg-emerald-50 text-emerald-700 border border-emerald-100 px-1.5 py-0.5 rounded font-mono font-bold">
                                {g}
                              </span>
                            ))}
                            {u.role === 'student' && (!u.allowedGrades || u.allowedGrades.length === 0) && (
                              <span className="text-[10px] text-stone-400 italic">Mặc định</span>
                            )}
                            {u.role === 'teacher' && (
                              <div className="space-y-1.5">
                                <div className="flex flex-wrap gap-1 max-w-[200px]">
                                  {u.allowedSubjects && u.allowedSubjects.length > 0 ? (
                                    u.allowedSubjects.map(s => (
                                      <span key={s} className="text-[9px] bg-blue-50 text-blue-700 border border-blue-100 px-1.5 py-0.5 rounded font-bold">
                                        {s}
                                      </span>
                                    ))
                                  ) : (
                                    <span className="text-[10px] text-stone-400 italic">Tất cả môn</span>
                                  )}
                                </div>
                                <div className="flex flex-wrap items-center gap-1 max-w-[200px]">
                                  <span className="text-[9px] text-stone-500 font-bold">Lớp:</span>
                                  {u.allowedClassIds && u.allowedClassIds.length > 0 ? (
                                    u.allowedClassIds.map(cid => {
                                      const cName = classes.find(c => c.id === cid)?.name || cid;
                                      return (
                                        <span key={cid} className="text-[9px] bg-emerald-50 text-emerald-700 border border-emerald-100 px-1.5 py-0.5 rounded font-bold">
                                          {cName}
                                        </span>
                                      );
                                    })
                                  ) : (
                                    <span className="text-[10px] text-stone-400 italic">Tất cả lớp</span>
                                  )}
                                </div>
                              </div>
                            )}
                            {u.role === 'admin' && <span className="text-stone-300">---</span>}
                          </div>
                        </td>
                        <td className="py-4 text-right space-x-1">
                          {u.role !== 'admin' && (
                            <>
                              {(u.role === 'student' || u.role === 'teacher') && (
                                <button 
                                  onClick={() => handleStartEditUser(u)}
                                  className="p-2 text-stone-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all inline-flex items-center"
                                  title={u.role === 'teacher' ? "Chỉnh sửa môn dạy & thông tin" : "Chỉnh sửa chủ đề & thông tin"}
                                >
                                  <Pencil className="w-4 h-4" />
                                </button>
                              )}
                              <button 
                                onClick={() => handleDeleteUser(u.uid)}
                                className="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-all inline-flex items-center"
                                title="Xóa tài khoản"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Custom Topics List Grouped by Class and Subject */}
          <div className="bg-white p-4 md:p-8 rounded-2xl border border-stone-200 shadow-sm">
            {(() => {
              const classesWithTopics = classesInYear.filter(cls => hasAnyCustomTopics(cls.customTopics));
              const classes2025WithTopics = classes.filter(
                cls =>
                  (cls.schoolYear || DEFAULT_SCHOOL_YEAR) === SOURCE_TOPICS_SCHOOL_YEAR &&
                  hasAnyCustomTopics(cls.customTopics)
              );
              const isInheritYear = selectedSchoolYear === TARGET_INHERIT_SCHOOL_YEAR;
              // Identify 2025-2026 classes whose grade isn't yet explicitly configured in 2026-2027
              const configuredGradesInTarget = new Set(
                classesInYear
                  .filter(c => c.customTopics !== undefined)
                  .map(c => extractGradeDigit(c.name) || c.name.toLowerCase().trim())
              );
              const inheritedFallbackClasses = isInheritYear
                ? classes2025WithTopics.filter(srcCls => {
                    const key = extractGradeDigit(srcCls.name) || srcCls.name.toLowerCase().trim();
                    return !configuredGradesInTarget.has(key);
                  })
                : [];

              return (
                <>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                    <div className="space-y-1">
                      <h3 className="text-base md:text-lg font-bold text-stone-900 flex items-center gap-2 flex-wrap">
                        <BookOpenCheck className="w-4 h-4 md:w-5 md:h-5 text-indigo-600" />
                        <span>Danh sách chủ đề tự tạo của từng lớp & môn học</span>
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
                          NH {selectedSchoolYear}
                        </span>
                      </h3>
                      <p className="text-xs text-stone-500 font-semibold">
                        {isInheritYear
                          ? `Năm học ${TARGET_INHERIT_SCHOOL_YEAR} tự động áp dụng chủ đề lớp giống Năm học ${SOURCE_TOPICS_SCHOOL_YEAR}.`
                          : `Xem chi tiết và xóa các chủ đề tự tạo của từng lớp trong Năm học ${selectedSchoolYear}.`}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 self-start sm:self-center">
                      {isInheritYear && classes2025WithTopics.length > 0 && (
                        <button
                          type="button"
                          onClick={handleSyncTopicsFrom2025}
                          disabled={isSyncingTopicsFrom2025}
                          className="px-4 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 rounded-xl text-xs font-bold transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                        >
                          {isSyncingTopicsFrom2025 ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                          Đồng bộ chủ đề từ {SOURCE_TOPICS_SCHOOL_YEAR}
                        </button>
                      )}
                      {classesWithTopics.length > 0 && (
                        <button
                          onClick={handleDeleteAllCustomTopics}
                          className="px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                          Xóa tất cả chủ đề tự tạo
                        </button>
                      )}
                    </div>
                  </div>

                  {classesWithTopics.length === 0 && inheritedFallbackClasses.length === 0 ? (
                    <div className="text-center py-10 bg-stone-50 rounded-xl border border-dashed border-stone-200">
                      <p className="text-xs text-stone-400 italic">Chưa có chủ đề tự thêm nào cho các lớp học trong Năm học {selectedSchoolYear}.</p>
                      <p className="text-[10px] text-stone-400 mt-1">Sử dụng mục "Thêm chủ đề cho lớp" bên trái để tạo chủ đề.</p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {inheritedFallbackClasses.length > 0 && (
                        <div className="space-y-4">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-4 py-3 rounded-xl bg-indigo-50/70 border border-indigo-100">
                            <p className="text-xs font-bold text-indigo-800">
                              Đang áp dụng tự động {inheritedFallbackClasses.length} lớp chủ đề từ Năm học {SOURCE_TOPICS_SCHOOL_YEAR} cho Năm học {TARGET_INHERIT_SCHOOL_YEAR}
                            </p>
                            <span className="text-[10px] font-mono font-bold text-indigo-600">
                              Học sinh {TARGET_INHERIT_SCHOOL_YEAR} đã thấy ngay các chủ đề này
                            </span>
                          </div>
                          {inheritedFallbackClasses.map((cls) => {
                            const subjectsWithTopics = Object.entries(cls.customTopics || {}).filter(
                              ([_, topics]) => Array.isArray(topics) && topics.length > 0
                            ) as [Subject, string[]][];

                            return (
                              <div key={`inherited-${cls.id}`} className="p-4 rounded-xl border border-indigo-100 bg-indigo-50/20 space-y-4">
                                <div className="flex items-center gap-2 pb-2 border-b border-indigo-100 flex-wrap">
                                  <School className="w-4 h-4 text-indigo-600" />
                                  <h4 className="text-sm font-extrabold text-stone-900">
                                    {cls.name}
                                  </h4>
                                  <span className="text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-100 px-2 py-0.5 rounded-full font-bold">
                                    Kế thừa từ {SOURCE_TOPICS_SCHOOL_YEAR}
                                  </span>
                                  <span className="text-[10px] bg-purple-50 text-purple-600 px-2 py-0.5 rounded-full font-bold">
                                    {subjectsWithTopics.length} môn học
                                  </span>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  {subjectsWithTopics.map(([subj, topics]) => {
                                    const isMath = subj.startsWith('Toán');
                                    const isVietnamese = subj.startsWith('Tiếng Việt') || subj.startsWith('Ngữ văn');
                                    const badgeColor = isMath
                                      ? 'bg-blue-100 text-blue-800'
                                      : isVietnamese
                                        ? 'bg-emerald-100 text-emerald-800'
                                        : 'bg-purple-100 text-purple-800';

                                    return (
                                      <div key={subj} className="p-3 rounded-lg border border-stone-200 bg-white flex flex-col justify-between space-y-3 shadow-sm">
                                        <div className="flex items-center justify-between">
                                          <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded ${badgeColor}`}>
                                            {subj}
                                          </span>
                                          <span className="text-[10px] text-stone-400 font-bold">
                                            {topics.length} chủ đề
                                          </span>
                                        </div>

                                        <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
                                          {topics.map((topic, index) => (
                                            <div key={index} className="flex items-center justify-between text-xs bg-stone-50 px-2.5 py-1.5 rounded border border-stone-100">
                                              <span className="text-stone-700 font-medium truncate pr-2">{topic}</span>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                      {classesWithTopics.map((cls) => {
                        const subjectsWithTopics = Object.entries(cls.customTopics || {}).filter(
                          ([_, topics]) => Array.isArray(topics) && topics.length > 0
                        ) as [Subject, string[]][];

                        return (
                          <div key={cls.id} className="p-4 rounded-xl border border-stone-100 bg-stone-50/50 space-y-4">
                            <div className="flex items-center gap-2 pb-2 border-b border-stone-100">
                              <School className="w-4 h-4 text-purple-600" />
                              <h4 className="text-sm font-extrabold text-stone-900">
                                {cls.name}
                              </h4>
                              <span className="text-[10px] bg-purple-50 text-purple-600 px-2 py-0.5 rounded-full font-bold">
                                {subjectsWithTopics.length} môn học có chủ đề tự tạo
                              </span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {subjectsWithTopics.map(([subj, topics]) => {
                                const isMath = subj.startsWith('Toán');
                                const isVietnamese = subj.startsWith('Tiếng Việt') || subj.startsWith('Ngữ văn');
                                const badgeColor = isMath 
                                  ? 'bg-blue-100 text-blue-800' 
                                  : isVietnamese 
                                    ? 'bg-emerald-100 text-emerald-800' 
                                    : 'bg-purple-100 text-purple-800';

                                return (
                                  <div key={subj} className="p-3 rounded-lg border border-stone-150 bg-white flex flex-col justify-between space-y-3 shadow-sm">
                                    <div className="flex items-center justify-between">
                                      <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded ${badgeColor}`}>
                                        {subj}
                                      </span>
                                      <span className="text-[10px] text-stone-400 font-bold">
                                        {topics.length} chủ đề
                                      </span>
                                    </div>

                                    <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
                                      {topics.map((topic, index) => (
                                        <div 
                                          key={index} 
                                          className="flex items-center justify-between p-2 bg-stone-50 rounded border border-stone-100 text-xs text-stone-700 font-medium hover:bg-stone-100 transition-colors"
                                        >
                                          <span className="truncate flex-1 pr-2">{topic}</span>
                                          <button
                                            type="button"
                                            onClick={() => handleDeleteCustomTopic(cls.id, subj, topic)}
                                            className="text-stone-400 hover:text-red-500 transition-colors p-0.5"
                                            title="Xóa chủ đề này"
                                          >
                                            <Trash2 className="w-3.5 h-3.5" />
                                          </button>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        </div>
      </div>

      {/* Editing User Modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-stone-200 shadow-xl max-w-md w-full overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between bg-stone-50">
              <h3 className="font-bold text-stone-900 flex items-center gap-2">
                <Pencil className="w-5 h-5 text-emerald-600" />
                {editingUser.role === 'teacher' ? 'Chỉnh sửa tài khoản giáo viên' : 'Chỉnh sửa tài khoản học sinh'}
              </h3>
              <button 
                onClick={() => setEditingUser(null)}
                className="p-1.5 hover:bg-stone-200 rounded-lg transition-all text-stone-400 hover:text-stone-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateUser} className="p-6 overflow-y-auto space-y-4">
              {/* Năm học của tài khoản */}
              <div className="space-y-1">
                <label className="text-[10px] font-mono uppercase tracking-widest text-stone-400 ml-2">Năm học</label>
                <select
                  value={editSchoolYear}
                  onChange={(e) => {
                    const nextYear = e.target.value;
                    setEditSchoolYear(nextYear);
                    setEditClassId('');
                    setEditAllowedClassIds([]);
                  }}
                  className="w-full px-4 py-3 rounded-xl border border-stone-200 text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                >
                  {availableSchoolYears.map(yr => (
                    <option key={yr} value={yr}>Năm học {yr}</option>
                  ))}
                </select>
              </div>

              {(() => {
                const editYearClasses = classes.filter(c => (c.schoolYear || DEFAULT_SCHOOL_YEAR) === editSchoolYear);
                return editingUser.role === 'teacher' ? (
                <>
                  <div className="space-y-1">
                    <label className="text-[10px] font-mono uppercase tracking-widest text-stone-400 ml-2">Họ và tên giáo viên</label>
                    <input 
                      type="text" 
                      value={editDisplayName}
                      onChange={(e) => setEditDisplayName(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-stone-200 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                      required
                    />
                  </div>

                  {/* Đơn vị công tác (Tùy chọn) */}
                  <div className="space-y-3 border border-stone-100 p-3.5 rounded-xl bg-stone-50/70">
                    <p className="text-[10px] font-mono uppercase tracking-widest text-stone-500 font-bold">
                      Đơn vị công tác (Tùy chọn)
                    </p>
                    <LocationSchoolSelector
                      provinceName={editProvinceName}
                      communeName={editCommuneName}
                      schoolName={editSchoolName}
                      onProvinceChange={setEditProvinceName}
                      onCommuneChange={setEditCommuneName}
                      onSchoolChange={setEditSchoolName}
                      required={false}
                      accent="blue"
                    />
                  </div>

                  {/* Phân công môn dạy */}
                  <div className="space-y-2 border border-stone-100 p-3.5 rounded-xl bg-stone-50">
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[10px] font-mono uppercase tracking-widest text-stone-500 font-bold block">
                        Phân công môn dạy (Tích chọn)
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          if (editAllowedSubjects.length === SUBJECTS.length) {
                            setEditAllowedSubjects([]);
                          } else {
                            setEditAllowedSubjects([...SUBJECTS]);
                          }
                        }}
                        className="text-[10px] text-blue-600 font-bold hover:underline"
                      >
                        {editAllowedSubjects.length === SUBJECTS.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs max-h-44 overflow-y-auto p-1">
                      {SUBJECTS.map(subj => (
                        <label key={subj} className="flex items-center gap-2 cursor-pointer select-none text-stone-700 hover:text-stone-900 bg-white p-2 rounded-lg border border-stone-200 shadow-sm">
                          <input 
                            type="checkbox"
                            checked={editAllowedSubjects.includes(subj)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setEditAllowedSubjects([...editAllowedSubjects, subj]);
                              } else {
                                setEditAllowedSubjects(editAllowedSubjects.filter(x => x !== subj));
                              }
                            }}
                            className="rounded border-stone-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="font-medium text-stone-800 text-[11px]">{subj}</span>
                        </label>
                      ))}
                    </div>
                    <p className="text-[9px] text-stone-400 italic">Nếu không chọn môn nào, giáo viên sẽ mặc định xem được tất cả môn học.</p>
                  </div>

                  {/* Phân công lớp dạy */}
                  <div className="space-y-2 border border-stone-100 p-3.5 rounded-xl bg-stone-50">
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[10px] font-mono uppercase tracking-widest text-stone-500 font-bold block">
                        Phân công lớp dạy ({editYearClasses.length} lớp • {editSchoolYear})
                      </label>
                      {editYearClasses.length > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            if (editAllowedClassIds.length === editYearClasses.length) {
                              setEditAllowedClassIds([]);
                            } else {
                              setEditAllowedClassIds(editYearClasses.map(c => c.id));
                            }
                          }}
                          className="text-[10px] text-blue-600 font-bold hover:underline"
                        >
                          {editAllowedClassIds.length === editYearClasses.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
                        </button>
                      )}
                    </div>
                    {editYearClasses.length === 0 ? (
                      <p className="text-[11px] text-amber-600 italic">Chưa có lớp nào trong Năm học {editSchoolYear}. Hãy tạo lớp học trước.</p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs max-h-44 overflow-y-auto p-1">
                        {editYearClasses.map(cls => (
                          <label key={cls.id} className="flex items-center gap-2 cursor-pointer select-none text-stone-700 hover:text-stone-900 bg-white p-2 rounded-lg border border-stone-200 shadow-sm">
                            <input 
                              type="checkbox"
                              checked={editAllowedClassIds.includes(cls.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setEditAllowedClassIds([...editAllowedClassIds, cls.id]);
                                } else {
                                  setEditAllowedClassIds(editAllowedClassIds.filter(x => x !== cls.id));
                                }
                              }}
                              className="rounded border-stone-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="font-medium text-stone-800 text-[11px]">{cls.name}</span>
                          </label>
                        ))}
                      </div>
                    )}
                    <p className="text-[9px] text-stone-400 italic">Nếu không chọn lớp nào, giáo viên sẽ xem được tất cả các lớp trong năm học này.</p>
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-1">
                    <label className="text-[10px] font-mono uppercase tracking-widest text-stone-400 ml-2">Họ và tên học sinh</label>
                    <input 
                      type="text" 
                      value={editDisplayName}
                      onChange={(e) => setEditDisplayName(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-stone-200 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-mono uppercase tracking-widest text-stone-400 ml-2">Lớp học ({editSchoolYear})</label>
                    <select 
                      value={editClassId}
                      onChange={(e) => setEditClassId(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-stone-200 text-sm outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                      required
                    >
                      <option value="">-- Chọn lớp --</option>
                      {editYearClasses.map(cls => (
                        <option key={cls.id} value={cls.id}>{cls.name}</option>
                      ))}
                    </select>
                  </div>

                  <LocationSchoolSelector
                    provinceName={editProvinceName}
                    communeName={editCommuneName}
                    schoolName={editSchoolName}
                    onProvinceChange={setEditProvinceName}
                    onCommuneChange={setEditCommuneName}
                    onSchoolChange={setEditSchoolName}
                    required={true}
                    accent="emerald"
                  />

                  <div className="space-y-2 border border-stone-100 p-3 rounded-xl bg-stone-50">
                    <label className="text-[10px] font-mono uppercase tracking-widest text-stone-400 block mb-1">
                      Chủ đề các khối lớp được học thêm
                    </label>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {['Lớp 1', 'Lớp 2', 'Lớp 3', 'Lớp 4', 'Lớp 5'].map(g => (
                        <label key={g} className="flex items-center gap-2 cursor-pointer select-none text-stone-700">
                          <input 
                            type="checkbox"
                            checked={editAllowedGrades.includes(g)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setEditAllowedGrades([...editAllowedGrades, g]);
                              } else {
                                setEditAllowedGrades(editAllowedGrades.filter(x => x !== g));
                              }
                            }}
                            className="rounded border-stone-300 text-emerald-600 focus:ring-emerald-500"
                          />
                          {g}
                        </label>
                      ))}
                    </div>
                  </div>
                </>
              );
              })()}

              <div className="flex gap-3 pt-2">
                <button 
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="flex-1 py-3 border border-stone-200 text-stone-500 hover:bg-stone-50 rounded-xl font-bold transition-all text-sm text-center"
                >
                  Hủy
                </button>
                <button 
                  type="submit"
                  disabled={isUpdatingUser}
                  className="flex-1 py-3 bg-emerald-600 text-white hover:bg-emerald-700 disabled:bg-stone-200 rounded-xl font-bold transition-all text-sm flex items-center justify-center gap-2"
                >
                  {isUpdatingUser ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Cập nhật'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      <AnimatePresence>
        {confirmModal && confirmModal.isOpen && (
          <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-stone-100 space-y-6"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                  <Trash2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-stone-900">{confirmModal.title}</h3>
                  <p className="text-xs text-stone-500 mt-1 leading-relaxed">{confirmModal.message}</p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setConfirmModal(null)}
                  className="px-5 py-2.5 rounded-xl border border-stone-200 text-stone-600 font-bold hover:bg-stone-50 transition-all text-sm cursor-pointer"
                >
                  Không
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const action = confirmModal.onConfirm;
                    setConfirmModal(null);
                    action();
                  }}
                  className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold transition-all shadow-md hover:shadow-lg text-sm cursor-pointer"
                >
                  Có, xóa ngay
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
