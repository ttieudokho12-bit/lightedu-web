import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { UserPlus, Users, Trash2, Shield, GraduationCap, UserCheck, Mail, Lock, User as UserIcon, Loader2, Search, FileText, CheckCircle2, AlertCircle, Download, School, Pencil, X, BookOpenCheck } from 'lucide-react';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { collection, query, onSnapshot, doc, setDoc, deleteDoc, getDocs, where } from 'firebase/firestore';
import { UserProfile, ClassRoom, Subject, SUBJECTS } from '../types';
import { initializeApp, getApp, getApps } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

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

export default function AdminDashboard() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
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

  // Student Metadata States for Creation
  const [schoolName, setSchoolName] = useState('');
  const [communeName, setCommuneName] = useState('');
  const [provinceName, setProvinceName] = useState('');
  const [selectedGrades, setSelectedGrades] = useState<string[]>([]);

  // Bulk Create State
  const [bulkNames, setBulkNames] = useState('');
  const [bulkRole, setBulkRole] = useState<'student' | 'teacher'>('student');
  const [bulkClassId, setBulkClassId] = useState('');
  const [isBulkCreating, setIsBulkCreating] = useState(false);
  const [bulkResults, setBulkResults] = useState<{name: string, email?: string, status: string, message?: string}[]>([]);

  // Bulk Student Metadata States
  const [bulkSchoolName, setBulkSchoolName] = useState('');
  const [bulkCommuneName, setBulkCommuneName] = useState('');
  const [bulkProvinceName, setBulkProvinceName] = useState('');
  const [bulkSelectedGrades, setBulkSelectedGrades] = useState<string[]>([]);

  // Editing User States
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [editDisplayName, setEditDisplayName] = useState('');
  const [editClassId, setEditClassId] = useState('');
  const [editSchoolName, setEditSchoolName] = useState('');
  const [editCommuneName, setEditCommuneName] = useState('');
  const [editProvinceName, setEditProvinceName] = useState('');
  const [editAllowedGrades, setEditAllowedGrades] = useState<string[]>([]);
  const [isUpdatingUser, setIsUpdatingUser] = useState(false);

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

  const createSingleUser = async (
    name: string, 
    userRole: 'student' | 'teacher', 
    classId?: string,
    studentSchool?: string,
    studentCommune?: string,
    studentProvince?: string,
    studentAllowedGrades?: string[]
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
    const email = `${username}@tuanlo.vn`;
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
        const cls = classes.find(c => c.id === classId);
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
        classId: userRole === 'student' ? classId : undefined,
        grade: userRole === 'student' ? grade : undefined,
        schoolName: userRole === 'student' ? studentSchool : undefined,
        communeName: userRole === 'student' ? studentCommune : undefined,
        provinceName: userRole === 'student' ? studentProvince : undefined,
        allowedGrades: userRole === 'student' ? finalAllowedGrades : undefined,
        password: password // Store the password for fallback authentication
      };

      await setDoc(doc(db, 'users', newUserUid), profile);
      
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
      if (!schoolName.trim()) {
        setError('Vui lòng nhập tên trường');
        return;
      }
      if (!communeName.trim()) {
        setError('Vui lòng nhập tên xã');
        return;
      }
      if (!provinceName.trim()) {
        setError('Vui lòng nhập tên tỉnh');
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
      selectedGrades
    );
    
    if (result.status === 'success') {
      setDisplayName('');
      setSchoolName('');
      setCommuneName('');
      setProvinceName('');
      setSelectedGrades([]);
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
      if (!bulkSchoolName.trim()) {
        setError('Vui lòng nhập tên trường cho danh sách học sinh');
        return;
      }
      if (!bulkCommuneName.trim()) {
        setError('Vui lòng nhập tên xã cho danh sách học sinh');
        return;
      }
      if (!bulkProvinceName.trim()) {
        setError('Vui lòng nhập tên tỉnh cho danh sách học sinh');
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
        bulkSelectedGrades
      );
      results.push(res);
      // Update results live
      setBulkResults([...results]);
    }

    setBulkNames('');
    setBulkSchoolName('');
    setBulkCommuneName('');
    setBulkProvinceName('');
    setBulkSelectedGrades([]);
    
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

  const handleDeleteUser = async (uid: string) => {
    if (!confirm('Bạn có đồng ý xóa tài khoản đã chọn không?')) return;
    
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
        alert('Xóa tài khoản thành công!');
      } else {
        // 2. Client-side fallback: delete Firestore document directly
        console.warn('Server-side deletion failed, attempting client-side fallback...');
        await deleteDoc(doc(db, 'users', uid));
        setSelectedUserIds(prev => prev.filter(id => id !== uid));
        alert('Xóa tài khoản thành công (dự phòng)!');
      }
    } catch (error) {
      console.error('Error deleting user, trying client-side fallback:', error);
      try {
        await deleteDoc(doc(db, 'users', uid));
        setSelectedUserIds(prev => prev.filter(id => id !== uid));
        alert('Xóa tài khoản thành công (dự phòng)!');
      } catch (clientErr) {
        console.error('Client-side fallback also failed:', clientErr);
        alert('Không thể xóa tài khoản. Vui lòng thử lại!');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleStartEditUser = (user: UserProfile) => {
    setEditingUser(user);
    setEditDisplayName(user.displayName || '');
    setEditClassId(user.classId || '');
    setEditSchoolName(user.schoolName || '');
    setEditCommuneName(user.communeName || '');
    setEditProvinceName(user.provinceName || '');
    setEditAllowedGrades(user.allowedGrades || []);
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    if (!editDisplayName.trim()) {
      alert('Vui lòng nhập tên học sinh');
      return;
    }
    if (!editClassId) {
      alert('Vui lòng chọn lớp học');
      return;
    }
    if (!editSchoolName.trim()) {
      alert('Vui lòng nhập tên trường');
      return;
    }
    if (!editCommuneName.trim()) {
      alert('Vui lòng nhập tên xã');
      return;
    }
    if (!editProvinceName.trim()) {
      alert('Vui lòng nhập tên tỉnh');
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
        classId: editClassId,
        grade: grade,
        schoolName: editSchoolName,
        communeName: editCommuneName,
        provinceName: editProvinceName,
        allowedGrades: finalAllowedGrades
      };

      await setDoc(doc(db, 'users', editingUser.uid), updatedProfile, { merge: true });
      
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
      await setDoc(doc(db, 'classes', classId), {
        name: newClassName,
        teacherId: auth.currentUser?.uid || 'admin'
      });
      setNewClassName('');
      alert(`Đã tạo lớp ${newClassName} thành công! Mã lớp: ${classId}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'classes');
    } finally {
      setIsCreatingClass(false);
    }
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

  const handleDeleteCustomTopic = async (classId: string, subject: Subject, topicToDelete: string) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa chủ đề "${topicToDelete}" không?`)) return;

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
  };

  const handleDeleteAllCustomTopics = async () => {
    if (!confirm('Bạn có chắc chắn muốn xóa TOÀN BỘ chủ đề tự tạo của tất cả các lớp học không? Hành động này không thể hoàn tác.')) return;

    setLoading(true);
    try {
      const classesWithTopics = classes.filter(cls => {
        if (!cls.customTopics) return false;
        return Object.entries(cls.customTopics).some(
          ([_, topics]) => Array.isArray(topics) && topics.length > 0
        );
      });

      if (classesWithTopics.length === 0) {
        alert('Không có chủ đề tự tạo nào để xóa!');
        setLoading(false);
        return;
      }

      const promises = classesWithTopics.map(cls => 
        setDoc(doc(db, 'classes', cls.id), {
          customTopics: {}
        }, { merge: true })
      );

      await Promise.all(promises);
      alert('Đã xóa thành công toàn bộ chủ đề tự tạo!');
    } catch (error) {
      console.error('Error deleting all custom topics:', error);
      alert('Lỗi khi xóa toàn bộ chủ đề');
    } finally {
      setLoading(false);
    }
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

  const handleDeleteSelected = async () => {
    if (selectedUserIds.length === 0) return;
    if (!confirm('Bạn có đồng ý xóa tài khoản đã chọn không?')) return;

    setLoading(true);
    try {
      const response = await fetch('/api/admin/delete-users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uids: selectedUserIds }),
      });
      if (response.ok) {
        setSelectedUserIds([]);
        alert('Đã xóa thành công các tài khoản đã chọn!');
      } else {
        console.warn('Server-side bulk deletion failed, using client-side fallback...');
        const promises = selectedUserIds.map(uid => deleteDoc(doc(db, 'users', uid)));
        await Promise.all(promises);
        setSelectedUserIds([]);
        alert('Đã xóa thành công các tài khoản đã chọn (dự phòng)!');
      }
    } catch (error) {
      console.error('Error deleting users, trying client-side fallback:', error);
      try {
        const promises = selectedUserIds.map(uid => deleteDoc(doc(db, 'users', uid)));
        await Promise.all(promises);
        setSelectedUserIds([]);
        alert('Đã xóa thành công các tài khoản đã chọn (dự phòng)!');
      } catch (clientErr) {
        console.error('Client-side fallback also failed:', clientErr);
        alert('Có lỗi xảy ra khi xóa các tài khoản. Vui lòng thử lại!');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAll = async () => {
    const deletableUsers = users.filter(u => u.role !== 'admin');
    if (deletableUsers.length === 0) return;
    if (!confirm('Bạn có đồng ý xóa tài khoản đã chọn không?')) return;

    setLoading(true);
    try {
      const uids = deletableUsers.map(u => u.uid);
      const response = await fetch('/api/admin/delete-users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uids }),
      });
      if (response.ok) {
        setSelectedUserIds([]);
        alert('Đã xóa tất cả tài khoản người dùng thành công!');
      } else {
        console.warn('Server-side bulk deletion failed, using client-side fallback...');
        const promises = uids.map(uid => deleteDoc(doc(db, 'users', uid)));
        await Promise.all(promises);
        setSelectedUserIds([]);
        alert('Đã xóa tất cả tài khoản người dùng thành công (dự phòng)!');
      }
    } catch (error) {
      console.error('Error deleting all users, trying client-side fallback:', error);
      try {
        const deletableUsers = users.filter(u => u.role !== 'admin');
        const uids = deletableUsers.map(u => u.uid);
        const promises = uids.map(uid => deleteDoc(doc(db, 'users', uid)));
        await Promise.all(promises);
        setSelectedUserIds([]);
        alert('Đã xóa tất cả tài khoản người dùng thành công (dự phòng)!');
      } catch (clientErr) {
        console.error('Client-side fallback also failed:', clientErr);
        alert('Có lỗi xảy ra khi xóa các tài khoản. Vui lòng thử lại!');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResetAllData = async () => {
    if (!confirm('CẢNH BÁO NGUY HIỂM!\n\nHành động này sẽ xóa hoàn toàn tất cả tài khoản học sinh, giáo viên, dữ liệu học tập (xuedu), các lớp học, đề thi và kết quả ôn luyện.\n\nChỉ giữ lại tài khoản quản trị (Admin).\n\nBạn có chắc chắn muốn tiến hành reset toàn bộ hệ thống không?')) {
      return;
    }
    
    if (!confirm('XÁC NHẬN CUỐI CÙNG!\n\nBạn chắc chắn muốn xóa sạch toàn bộ dữ liệu hệ thống chứ? Thao tác này KHÔNG THỂ HOÀN TÁC!')) {
      return;
    }

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
  };

  const filteredUsers = users.filter(u => 
    u.email.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.displayName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
        {/* Create User Form */}
        <div className="lg:col-span-1 space-y-6 md:space-y-8">
          {/* Create Class Form */}
          <div className="bg-white p-5 md:p-6 rounded-2xl border border-stone-200 shadow-sm">
            <h3 className="text-base md:text-lg font-bold text-stone-900 mb-4 md:mb-6 flex items-center gap-2">
              <School className="w-4 h-4 md:w-5 md:h-5 text-purple-600" />
              Tạo lớp học mới
            </h3>
            <form onSubmit={handleCreateClass} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-mono uppercase tracking-widest text-stone-400 ml-2">Tên lớp học</label>
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
                className="w-full py-3 bg-purple-600 text-white font-bold rounded-xl hover:bg-purple-700 disabled:bg-stone-200 transition-all flex items-center justify-center gap-2 shadow-md"
              >
                {isCreatingClass ? <Loader2 className="w-4 h-4 animate-spin" /> : <School className="w-4 h-4" />}
                Tạo lớp học
              </button>
            </form>
          </div>

          <div className="bg-white p-5 md:p-6 rounded-2xl border border-stone-200 shadow-sm">
            <h3 className="text-base md:text-lg font-bold text-stone-900 mb-4 md:mb-6 flex items-center gap-2">
              <UserPlus className="w-4 h-4 md:w-5 md:h-5 text-emerald-600" />
              Cấp tài khoản mới
            </h3>

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
                        <option value="">-- Chọn lớp --</option>
                        {classes.map(cls => (
                          <option key={cls.id} value={cls.id}>{cls.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-mono uppercase tracking-widest text-stone-400 ml-2">Tên trường</label>
                    <input 
                      type="text" 
                      placeholder="Trường Tiểu học..."
                      value={schoolName}
                      onChange={(e) => setSchoolName(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-stone-200 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-mono uppercase tracking-widest text-stone-400 ml-2">Tên xã</label>
                    <input 
                      type="text" 
                      placeholder="Xã..."
                      value={communeName}
                      onChange={(e) => setCommuneName(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-stone-200 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-mono uppercase tracking-widest text-stone-400 ml-2">Tên tỉnh</label>
                    <input 
                      type="text" 
                      placeholder="Tỉnh..."
                      value={provinceName}
                      onChange={(e) => setProvinceName(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-stone-200 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                      required
                    />
                  </div>

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
            <h3 className="text-base md:text-lg font-bold text-stone-900 mb-4 md:mb-6 flex items-center gap-2">
              <FileText className="w-4 h-4 md:w-5 md:h-5 text-blue-600" />
              Cấp tài khoản hàng loạt
            </h3>

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
                        <option value="">-- Chọn lớp --</option>
                        {classes.map(cls => (
                          <option key={cls.id} value={cls.id}>{cls.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-mono uppercase tracking-widest text-stone-400 ml-2">Tên trường</label>
                    <input 
                      type="text" 
                      placeholder="Trường Tiểu học..."
                      value={bulkSchoolName}
                      onChange={(e) => setBulkSchoolName(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-stone-200 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-mono uppercase tracking-widest text-stone-400 ml-2">Tên xã</label>
                    <input 
                      type="text" 
                      placeholder="Xã..."
                      value={bulkCommuneName}
                      onChange={(e) => setBulkCommuneName(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-stone-200 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-mono uppercase tracking-widest text-stone-400 ml-2">Tên tỉnh</label>
                    <input 
                      type="text" 
                      placeholder="Tỉnh..."
                      value={bulkProvinceName}
                      onChange={(e) => setBulkProvinceName(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-stone-200 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>

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
                    <option value="">-- Chọn lớp học --</option>
                    {classes.map(cls => (
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
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 md:mb-8">
              <div className="space-y-1">
                <h3 className="text-base md:text-lg font-bold text-stone-900 flex items-center gap-2">
                  <Users className="w-4 h-4 md:w-5 md:h-5 text-blue-600" />
                  Danh sách tài khoản ({users.length})
                </h3>
                {selectedUserIds.length > 0 && (
                  <p className="text-[10px] font-bold text-blue-600 animate-pulse">
                    Đã chọn {selectedUserIds.length} tài khoản
                  </p>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
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
                  className="flex items-center gap-2 px-3 py-2 bg-stone-900 text-white rounded-lg text-[10px] font-bold hover:bg-stone-800 transition-all"
                >
                  <Trash2 className="w-3 h-3" />
                  Xóa tất cả
                </button>
                <div className="relative flex-1 md:flex-none">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-300" />
                  <input 
                    type="text" 
                    placeholder="Tìm kiếm..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 rounded-lg border border-stone-100 text-xs md:text-sm outline-none focus:ring-2 focus:ring-emerald-500 w-full md:w-48"
                  />
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
                      <td colSpan={6} className="py-8 text-center text-stone-400 italic text-sm">
                        Không tìm thấy người dùng nào
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
                              <p className="text-[10px] md:text-xs text-stone-400">{u.email.replace('@tuanlo.vn', '')}</p>
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
                            {u.role === 'student' && (u.schoolName || u.communeName || u.provinceName) && (
                              <p className="text-[10px] text-stone-400 truncate max-w-[150px]" title={`${u.schoolName}, ${u.communeName}, ${u.provinceName}`}>
                                {u.schoolName && `${u.schoolName}`}{u.communeName && `, ${u.communeName}`}{u.provinceName && `, ${u.provinceName}`}
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
                            {u.role !== 'student' && <span className="text-stone-300">---</span>}
                          </div>
                        </td>
                        <td className="py-4 text-right space-x-1">
                          {u.role !== 'admin' && (
                            <>
                              {u.role === 'student' && (
                                <button 
                                  onClick={() => handleStartEditUser(u)}
                                  className="p-2 text-stone-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all md:opacity-0 md:group-hover:opacity-100 inline-flex items-center"
                                  title="Chỉnh sửa chủ đề & thông tin"
                                >
                                  <Pencil className="w-4 h-4" />
                                </button>
                              )}
                              <button 
                                onClick={() => handleDeleteUser(u.uid)}
                                className="p-2 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all md:opacity-0 md:group-hover:opacity-100 inline-flex items-center"
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
              const classesWithTopics = classes.filter(cls => {
                if (!cls.customTopics) return false;
                return Object.entries(cls.customTopics).some(
                  ([_, topics]) => Array.isArray(topics) && topics.length > 0
                );
              });

              return (
                <>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                    <div className="space-y-1">
                      <h3 className="text-base md:text-lg font-bold text-stone-900 flex items-center gap-2">
                        <BookOpenCheck className="w-4 h-4 md:w-5 md:h-5 text-indigo-600" />
                        Danh sách chủ đề tự tạo của từng lớp & môn học
                      </h3>
                      <p className="text-xs text-stone-500 font-semibold">
                        Xem chi tiết và xóa các chủ đề tự tạo của từng lớp, từng môn học.
                      </p>
                    </div>
                    {classesWithTopics.length > 0 && (
                      <button
                        onClick={handleDeleteAllCustomTopics}
                        className="px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 rounded-xl text-xs font-bold transition-all flex items-center gap-2 self-start sm:self-center cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                        Xóa tất cả chủ đề tự tạo
                      </button>
                    )}
                  </div>

                  {classesWithTopics.length === 0 ? (
                    <div className="text-center py-10 bg-stone-50 rounded-xl border border-dashed border-stone-200">
                      <p className="text-xs text-stone-400 italic">Chưa có chủ đề tự thêm nào cho các lớp học.</p>
                      <p className="text-[10px] text-stone-400 mt-1">Sử dụng mục "Thêm chủ đề cho lớp" bên trái để tạo chủ đề.</p>
                    </div>
                  ) : (
                    <div className="space-y-6">
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
                Chỉnh sửa tài khoản học sinh
              </h3>
              <button 
                onClick={() => setEditingUser(null)}
                className="p-1.5 hover:bg-stone-200 rounded-lg transition-all text-stone-400 hover:text-stone-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateUser} className="p-6 overflow-y-auto space-y-4">
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
                <label className="text-[10px] font-mono uppercase tracking-widest text-stone-400 ml-2">Lớp học</label>
                <select 
                  value={editClassId}
                  onChange={(e) => setEditClassId(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-stone-200 text-sm outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                  required
                >
                  <option value="">-- Chọn lớp --</option>
                  {classes.map(cls => (
                    <option key={cls.id} value={cls.id}>{cls.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-mono uppercase tracking-widest text-stone-400 ml-2">Tên trường</label>
                <input 
                  type="text" 
                  value={editSchoolName}
                  onChange={(e) => setEditSchoolName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-stone-200 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-mono uppercase tracking-widest text-stone-400 ml-2">Tên xã</label>
                <input 
                  type="text" 
                  value={editCommuneName}
                  onChange={(e) => setEditCommuneName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-stone-200 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-mono uppercase tracking-widest text-stone-400 ml-2">Tên tỉnh</label>
                <input 
                  type="text" 
                  value={editProvinceName}
                  onChange={(e) => setEditProvinceName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-stone-200 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>

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
    </div>
  );
}
