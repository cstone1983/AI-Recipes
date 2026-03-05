import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChefHat, Search, Plus, Settings, Link as LinkIcon, FileText, Image as ImageIcon, Loader2, Clock, Users, BookOpen, Download, Upload, FileJson, Printer, ShieldAlert, LogOut, User as UserIcon, Check, X, Edit2, Trash2, Globe, Sparkles, RefreshCw, Layers, Layout, Palette, Wand2, Zap, Type, Droplets, Eye } from 'lucide-react';

type ImportType = 'url' | 'text' | 'image' | 'manual';
type ViewState = 'login' | 'importer' | 'settings' | 'cookbook' | 'admin';

export default function App() {
  const [view, setView] = useState<ViewState>('login');
  const [user, setUser] = useState<any>(null);
  
  // Auth State
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [loginId, setLoginId] = useState(''); // For login
  const [email, setEmail] = useState(''); // For register
  const [username, setUsername] = useState(''); // For register
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');

  // Importer State
  const [importType, setImportType] = useState<ImportType>('url');
  const [importInput, setImportInput] = useState('');
  const [useWebSearch, setUseWebSearch] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [extractionStatus, setExtractionStatus] = useState<string>('');
  const [activeRecipe, setActiveRecipe] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [potentialDuplicates, setPotentialDuplicates] = useState<any[]>([]);
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);
  const [isCheckingDuplicates, setIsCheckingDuplicates] = useState(false);

  // Cookbook State
  const [recipes, setRecipes] = useState<any[]>([]);
  const [selectedRecipes, setSelectedRecipes] = useState<Set<string>>(new Set());
  const [isExporting, setIsExporting] = useState(false);
  const [viewingRecipe, setViewingRecipe] = useState<any>(null);
  const [recipeViewMode, setRecipeViewMode] = useState<'list' | 'grid'>('grid');
  const [recipeSort, setRecipeSort] = useState<'newest' | 'oldest' | 'alpha'>('newest');
  const [recipeFilter, setRecipeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [recipeOwnershipFilter, setRecipeOwnershipFilter] = useState<'mine' | 'all'>('mine');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Settings State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordMessage, setPasswordMessage] = useState('');

  // Admin State
  const [users, setUsers] = useState<any[]>([]);
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [geminiModel, setGeminiModel] = useState('gemini-3-flash-preview');
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [isAiConfigured, setIsAiConfigured] = useState(true);
  const [token, setToken] = useState<string | null>(localStorage.getItem('session_token'));
  
  // Admin User Management State
  const [newUsername, setNewUsername] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState('User');
  const [adminUserMessage, setAdminUserMessage] = useState('');
  const [adminCategories, setAdminCategories] = useState<any[]>([]);
  const [isSuggestingCategory, setIsSuggestingCategory] = useState(false);
  const [changingPasswordUserId, setChangingPasswordUserId] = useState<string | null>(null);
  const [adminNewPassword, setAdminNewPassword] = useState('');
  const [updateInfo, setUpdateInfo] = useState<any>(null);
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [isApplyingUpdate, setIsApplyingUpdate] = useState(false);
  const [updateLogs, setUpdateLogs] = useState<string[]>([]);
  const [updateUrl, setUpdateUrl] = useState('');
  const [duplicateGroups, setDuplicateGroups] = useState<any[]>([]);
  const [isScanningDuplicates, setIsScanningDuplicates] = useState(false);
  const [hasScannedDuplicates, setHasScannedDuplicates] = useState(false);
  const [scannedCount, setScannedCount] = useState(0);

  // Global check for system update status
  useEffect(() => {
    const checkStatus = async () => {
      if (!token) return;
      try {
        const res = await fetch('/api/health', { headers: getHeaders() });
        if (res.status === 503) {
          setIsApplyingUpdate(true);
        } else if (res.ok) {
          const data = await res.json();
          if (data.isUpdating === false && isApplyingUpdate) {
            console.log('Server says update is finished. Clearing UI.');
            setIsApplyingUpdate(false);
          }
        }
      } catch (e) {
        console.error('Status check failed', e);
      }
    };
    
    checkStatus();
    const interval = setInterval(checkStatus, 10000); // Check every 10s
    return () => clearInterval(interval);
  }, [token, isApplyingUpdate]);

  // Handle SSE stream for updates
  useEffect(() => {
    let eventSource: EventSource | null = null;
    let reconnectTimeout: any = null;

    const connectStream = () => {
      if (!isApplyingUpdate || !token) return;
      
      console.log('Connecting to update stream...');
      // Note: EventSource doesn't support custom headers, so we pass token in query param
      eventSource = new EventSource(`/api/admin/update/stream?token=${token}`);
      
      eventSource.onmessage = (event) => {
        try {
          const log = JSON.parse(event.data);
          setUpdateLogs(prev => {
            if (prev.includes(log)) return prev;
            return [...prev, log];
          });
          
          if (log.includes('[DONE]')) {
            eventSource?.close();
            if (log.includes('Exit code: 0')) {
              setUpdateLogs(prev => [...prev, 'Update successful! Waiting for server to restart...']);
              
              // Poll for health before reloading
              const pollHealth = async () => {
                try {
                  const res = await fetch('/api/health');
                  if (res.ok) {
                    const data = await res.json();
                    if (data.status === 'ok' && !data.isUpdating) {
                      setUpdateLogs(prev => [...prev, 'Server is back online! Reloading...']);
                      setTimeout(() => window.location.reload(), 1000);
                      return;
                    }
                  }
                } catch (e) {
                  // Ignore errors during restart
                }
                setTimeout(pollHealth, 2000);
              };
              
              setTimeout(pollHealth, 5000); // Start polling after 5s
            } else {
              setUpdateLogs(prev => [...prev, 'Update failed or finished with errors.']);
              // Don't auto-close so user can see logs, but allow them to exit
            }
          }
        } catch (e) {
          console.error('Failed to parse log', e);
        }
      };

      eventSource.onerror = () => {
        console.warn('SSE Connection lost. Reconnecting...');
        eventSource?.close();
        if (isApplyingUpdate) {
          reconnectTimeout = setTimeout(connectStream, 3000);
        }
      };
    };

    if (isApplyingUpdate) {
      connectStream();
    } else {
      eventSource?.close();
    }

    return () => {
      eventSource?.close();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
    };
  }, [isApplyingUpdate, token]);

  // Export Options State
  const [showExportOptions, setShowExportOptions] = useState(false);
  const [exportOptions, setExportOptions] = useState({
    layout: 'classic',
    design: 'standard',
    includeImages: true,
    fontSize: 'medium',
    colorTheme: 'monochrome',
    includeTOC: true,
    includeCover: true,
    paperSize: 'a4',
  });

  // Similar Search State
  const [isSearchingSimilar, setIsSearchingSimilar] = useState(false);
  const [similarRecipes, setSimilarRecipes] = useState<any[]>([]);
  const [showSimilarModal, setShowSimilarModal] = useState(false);
  const [searchPrompt, setSearchPrompt] = useState('');
  const [isRestoring, setIsRestoring] = useState(false);
  const restoreFileInputRef = React.useRef<HTMLInputElement>(null);

  const handleRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!confirm('Are you sure you want to restore from this backup? This will overwrite ALL current data and restart the server.')) {
      if (restoreFileInputRef.current) restoreFileInputRef.current.value = '';
      return;
    }

    setIsRestoring(true);
    const formData = new FormData();
    formData.append('backup', file);

    try {
      const res = await fetch('/api/admin/restore', {
        method: 'POST',
        headers: { 'x-session-token': token || '' },
        body: formData
      });

      const data = await res.json();
      if (data.success) {
        alert('System restored successfully. The application will restart in a few seconds.');
        setTimeout(() => {
          window.location.reload();
        }, 3000);
      } else {
        alert('Restore failed: ' + data.error);
      }
    } catch (err) {
      console.error('Restore error:', err);
      alert('Restore failed. Check console for details.');
    } finally {
      setIsRestoring(false);
      if (restoreFileInputRef.current) restoreFileInputRef.current.value = '';
    }
  };

  // Auth Headers Helper
  const getHeaders = () => {
    const headers: any = { 'Content-Type': 'application/json' };
    if (token) headers['x-session-token'] = token;
    return headers;
  };

  useEffect(() => {
    fetch('/api/auth/me', { headers: getHeaders() })
      .then(res => res.json())
      .then(data => {
        if (data.user) {
          setUser(data.user);
          if (data.isAiConfigured !== undefined) {
            setIsAiConfigured(data.isAiConfigured);
          }
          setView('cookbook');
        }
      })
      .catch(() => {});
  }, [token]);

  useEffect(() => {
    if ((view === 'cookbook' || view === 'importer') && user) {
      fetchRecipes();
    } else if (view === 'admin' && user?.role === 'Admin') {
      fetchConfig();
      fetchAdminCategories();
    }
    
    // Always fetch users if admin, so we can use it in the recipe editor
    if (user?.role === 'Admin') {
      fetchUsers();
    }
  }, [view, user, recipeOwnershipFilter]);

  useEffect(() => {
    if (isApplyingUpdate) {
      const element = document.getElementById('update-logs-end');
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }, [updateLogs, isApplyingUpdate]);

  const fetchRecipes = async () => {
    try {
      const res = await fetch(`/api/recipes?filter=${recipeOwnershipFilter}`, { headers: getHeaders() });
      if (res.status === 503) {
        setIsApplyingUpdate(true);
        return;
      }
      const data = await res.json();
      if (Array.isArray(data)) setRecipes(data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/admin/users', { headers: getHeaders() });
      const data = await res.json();
      if (Array.isArray(data)) setUsers(data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchAdminCategories = async () => {
    try {
      const res = await fetch('/api/admin/categories', { headers: getHeaders() });
      const data = await res.json();
      if (Array.isArray(data)) setAdminCategories(data);
    } catch (err) {}
  };

  const handleRenameCategory = async (oldName: string) => {
    const newName = prompt(`Rename category "${oldName}" to:`, oldName);
    if (!newName || newName === oldName) return;

    try {
      const res = await fetch('/api/admin/categories/rename', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ oldName, newName })
      });
      if (res.ok) {
        fetchAdminCategories();
        fetchRecipes();
      }
    } catch (err) {
      alert('Failed to rename category');
    }
  };

  const handleDeleteCategory = async (name: string) => {
    if (!confirm(`Are you sure you want to remove the category "${name}" from all recipes? This will not delete the recipes themselves.`)) return;

    try {
      const res = await fetch('/api/admin/categories/delete', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ name })
      });
      if (res.ok) {
        fetchAdminCategories();
        fetchRecipes();
      }
    } catch (err) {
      alert('Failed to delete category');
    }
  };

  const fetchConfig = async () => {
    try {
      const res = await fetch('/api/admin/config', { headers: getHeaders() });
      const data = await res.json();
      if (data) {
        setGeminiApiKey(data.geminiApiKey || '');
        setGeminiModel(data.geminiModel || 'gemini-3-flash-preview');
        setUpdateUrl(data.updateUrl || '');
        setIsAiConfigured(data.isConfigured);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveConfig = async () => {
    setIsSavingConfig(true);
    try {
      const res = await fetch('/api/admin/config', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ geminiApiKey, geminiModel, updateUrl })
      });
      const data = await res.json();
      if (data.success) {
        alert('Gemini configuration updated!');
        fetchConfig();
      } else {
        alert('Failed to update configuration: ' + data.error);
      }
    } catch (e) {
      alert('Network error while saving configuration.');
    } finally {
      setIsSavingConfig(false);
    }
  };

  const checkUpdate = async () => {
    setIsCheckingUpdate(true);
    try {
      const res = await fetch('/api/admin/update/check', { headers: getHeaders() });
      const data = await res.json();
      setUpdateInfo(data);
    } catch (e) {
      alert('Failed to check for updates');
    } finally {
      setIsCheckingUpdate(false);
    }
  };

  const applyUpdate = async () => {
    if (!updateInfo?.hasUpdate) return;
    setIsApplyingUpdate(true);
    setUpdateLogs(['Initializing update...']);
    
    try {
      const res = await fetch('/api/admin/update/apply', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ version: updateInfo.latestVersion })
      });
      
      // The server might close the connection immediately after sending the response
      // or even before if the process exits too quickly, so we handle both cases.
      try {
        const data = await res.json();
        if (!data.success) {
          alert('Failed to start update: ' + data.error);
          setIsApplyingUpdate(false);
        }
      } catch (jsonError) {
        // If we can't parse JSON, assume the server restarted successfully
        console.log('Server likely restarted before sending full response.');
      }
    } catch (e) {
      // Network errors are expected here because the server is restarting
      console.log('Network error during update (expected):', e);
    }
  };

  const handleSearchSimilar = async (recipeId?: string) => {
    setIsSearchingSimilar(true);
    try {
      const res = await fetch('/api/recipes/search-similar', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ recipeId, prompt: searchPrompt })
      });
      const data = await res.json();
      if (data.success) {
        setSimilarRecipes(data.data);
        setShowSimilarModal(true);
      }
    } catch (e) {
      alert('Failed to search similar recipes');
    } finally {
      setIsSearchingSimilar(false);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    try {
      const endpoint = authMode === 'login' ? '/api/auth/login' : '/api/auth/register';
      const body = authMode === 'login' ? { loginId, password } : { email, username, password };
      
      console.log(`Attempting ${authMode} at ${endpoint}`);
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      
      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const data = await res.json();
        if (data.success) {
          if (data.token) {
            localStorage.setItem('session_token', data.token);
            setToken(data.token);
          }
          if (data.isAiConfigured !== undefined) {
            setIsAiConfigured(data.isAiConfigured);
          }
          setUser(data.user);
          setView('cookbook');
        } else {
          setAuthError(data.error || 'Authentication failed');
        }
      } else {
        const text = await res.text();
        console.error('Unexpected response format:', text.substring(0, 100));
        setAuthError(`Server returned unexpected format (likely HTML). Check server logs.`);
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      setAuthError(`Network or Client Error: ${err.message}`);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST', headers: getHeaders() });
    localStorage.removeItem('session_token');
    setToken(null);
    setUser(null);
    setView('login');
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMessage('');
    try {
      const res = await fetch('/api/auth/password', {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({ currentPassword, newPassword })
      });
      const data = await res.json();
      if (data.success) {
        setPasswordMessage('Password changed successfully.');
        setCurrentPassword('');
        setNewPassword('');
      } else {
        setPasswordMessage('Error: ' + data.error);
      }
    } catch (e) {
      setPasswordMessage('Network error.');
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminUserMessage('');
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ username: newUsername, email: newEmail, password: newUserPassword, role: newUserRole })
      });
      const data = await res.json();
      if (data.success) {
        setAdminUserMessage('User added successfully.');
        setNewUsername('');
        setNewEmail('');
        setNewUserPassword('');
        setNewUserRole('User');
        fetchUsers();
      } else {
        setAdminUserMessage('Error: ' + data.error);
      }
    } catch (e) {
      setAdminUserMessage('Network error.');
    }
  };

  const handleAdminChangePassword = async (userId: string) => {
    if (!adminNewPassword) return;
    try {
      const res = await fetch(`/api/admin/users/${userId}/password`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({ newPassword: adminNewPassword })
      });
      const data = await res.json();
      if (data.success) {
        alert('Password updated successfully.');
        setChangingPasswordUserId(null);
        setAdminNewPassword('');
      } else {
        alert('Error: ' + data.error);
      }
    } catch (e) {
      alert('Network error.');
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}/role`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({ role: newRole })
      });
      const data = await res.json();
      if (data.success) {
        fetchUsers();
      } else {
        alert('Error: ' + data.error);
      }
    } catch (e) {
      alert('Network error.');
    }
  };

  const [showImagePicker, setShowImagePicker] = useState(false);
  const [imagePickerTab, setImagePickerTab] = useState<'url' | 'upload' | 'ai'>('ai');
  const [suggestedImages, setSuggestedImages] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const handleSuggestImages = async () => {
    if (!activeRecipe.title) return alert('Please enter a title first');
    setExtractionStatus('Finding images...');
    setIsImporting(true); 
    try {
      const res = await fetch('/api/recipes/suggest-image', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ title: activeRecipe.title })
      });
      const data = await res.json();
      if (data.imageUrls && data.imageUrls.length > 0) {
        setSuggestedImages(data.imageUrls);
      } else {
        alert('No images found');
      }
    } catch (e) {
      alert('Failed to find images');
    } finally {
      setIsImporting(false);
      setExtractionStatus('');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('image', file);

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });
      const data = await res.json();
      if (data.success) {
        setActiveRecipe({ ...activeRecipe, imageUrl: data.imageUrl });
        setShowImagePicker(false);
      } else {
        alert('Upload failed: ' + data.error);
      }
    } catch (error) {
      alert('Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSuggestCategory = async () => {
    if (!activeRecipe.title) return alert('Please enter a title first');
    setExtractionStatus('Suggesting category...');
    setIsSuggestingCategory(true);
    try {
      const existingCategories = Array.from(new Set(recipes.map(r => r.category).filter(Boolean)));
      const res = await fetch('/api/recipes/suggest-category', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ 
          title: activeRecipe.title,
          description: activeRecipe.description,
          ingredients: activeRecipe.ingredients,
          existingCategories
        })
      });
      const data = await res.json();
      if (data.category) {
        setActiveRecipe({ ...activeRecipe, category: data.category });
      }
    } catch (e) {
      alert('Failed to suggest category');
    } finally {
      setIsSuggestingCategory(false);
      setExtractionStatus('');
    }
  };

  const handleStartManualEntry = () => {
    setActiveRecipe({
      title: '',
      description: '',
      prepTime: 0,
      cookTime: 0,
      yield: '',
      ingredients: [{ name: '', amount: '', unit: '', notes: '' }],
      instructions: '',
      category: '',
      imageUrl: '',
      visibility: 'Private',
      authorId: user?.id,
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      fiber: 0
    });
    setIsEditing(false);
    setView('importer');
    setIsMobileMenuOpen(false);
  };

  const handleCancelUpdate = async () => {
    try {
      const res = await fetch('/api/admin/update/cancel', {
        method: 'POST',
        headers: getHeaders()
      });
      const data = await res.json();
      if (data.success) {
        setIsApplyingUpdate(false);
        setUpdateLogs(prev => [...prev, 'Update cancelled by user.']);
      }
    } catch (e) {
      alert('Failed to cancel update');
    }
  };

  const handleImport = async () => {
    if (!importInput && importType !== 'image') return;
    setIsImporting(true);
    setExtractionStatus('Connecting to Gemini AI...');
    console.log('Starting import...', { type: importType, useWebSearch });
    try {
      setTimeout(() => setExtractionStatus('Analyzing content...'), 2000);
      setTimeout(() => setExtractionStatus('Extracting ingredients and instructions...'), 5000);
      setTimeout(() => setExtractionStatus('Finalizing recipe structure...'), 8000);

      const res = await fetch('/api/recipes/parse', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ input: importInput, type: importType, useWebSearch })
      });
      
      setExtractionStatus('Processing response...');
      console.log('Response status:', res.status);
      const contentType = res.headers.get('content-type');
      
      if (contentType && contentType.includes('application/json')) {
        const data = await res.json();
        console.log('Response data:', data);
        if (data.success) {
          let recipe = data.data;
          if (!recipe.authorId) recipe.authorId = user?.id;
          
          setActiveRecipe(recipe);
          setImportInput('');
          setIsEditing(true); // Switch to edit mode so user can review/save
          setView('importer'); // Ensure we stay in the importer/editor view
        } else {
          const errorMsg = data.message ? `${data.error}: ${data.message}` : data.error;
          alert('Failed to import recipe: ' + (errorMsg || 'Unknown error'));
        }
      } else {
        const text = await res.text();
        console.error('Non-JSON response:', text.substring(0, 200));
        alert('Server error: Received unexpected response format.');
      }
    } catch (err: any) {
      console.error('Import catch error:', err);
      alert('Network error during import: ' + err.message);
    } finally {
      setIsImporting(false);
      setExtractionStatus('');
    }
  };

  const formatFraction = (amount: string | number | undefined) => {
    if (!amount) return '';
    const strAmount = amount.toString().trim();
    
    // If it already contains a fraction or doesn't look like a number, return as is
    if (strAmount.includes('/') || isNaN(Number(strAmount))) return strAmount;
    
    const num = parseFloat(strAmount);
    const whole = Math.floor(num);
    const decimal = num - whole;
    
    if (decimal < 0.01) return whole.toString();
    
    const fractions: [number, string][] = [
      [0.125, '1/8'],
      [0.25, '1/4'],
      [0.333, '1/3'],
      [0.375, '3/8'],
      [0.5, '1/2'],
      [0.625, '5/8'],
      [0.666, '2/3'],
      [0.75, '3/4'],
      [0.875, '7/8'],
    ];
    
    let closest = fractions[0];
    let minDiff = Math.abs(decimal - closest[0]);
    
    for (let i = 1; i < fractions.length; i++) {
      const diff = Math.abs(decimal - fractions[i][0]);
      if (diff < minDiff) {
        minDiff = diff;
        closest = fractions[i];
      }
    }
    
    if (minDiff > 0.05) return num.toString();
    
    const fractionStr = closest[1];
    const unicodeFractions: Record<string, string> = {
      '1/4': '¼',
      '1/2': '½',
      '3/4': '¾',
      '1/3': '⅓',
      '2/3': '⅔',
      '1/8': '⅛',
      '3/8': '⅜',
      '5/8': '⅝',
      '7/8': '⅞',
    };
    
    const displayFraction = unicodeFractions[fractionStr] || fractionStr;
    
    if (whole === 0) return displayFraction;
    return `${whole}${displayFraction}`;
  };

  const checkSimilarity = (r1: any, r2: any) => {
    if (!r1.title || !r2.title) return 0;
    const t1 = r1.title.toLowerCase().trim();
    const t2 = r2.title.toLowerCase().trim();
    
    if (t1 === t2) return 1.0;
    
    const words1 = t1.split(/\s+/).filter((w: string) => w.length > 2);
    const words2 = t2.split(/\s+/).filter((w: string) => w.length > 2);
    
    if (words1.length === 0 || words2.length === 0) return 0;

    const set1 = new Set(words1);
    const set2 = new Set(words2);
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const titleScore = intersection.size / Math.max(set1.size, set2.size);
    
    if (titleScore > 0.8) return titleScore;

    const ing1 = new Set(r1.ingredients?.map((i: any) => i.name?.toLowerCase().trim()).filter(Boolean) || []);
    const ing2 = new Set(r2.ingredients?.map((i: any) => i.name?.toLowerCase().trim()).filter(Boolean) || []);
    
    if (ing1.size > 0 && ing2.size > 0) {
      const ingIntersection = new Set([...ing1].filter(x => ing2.has(x)));
      const ingScore = ingIntersection.size / Math.max(ing1.size, ing2.size);
      return (titleScore * 0.3) + (ingScore * 0.7);
    }

    return titleScore;
  };

  const handleSaveRecipe = async (bypassDuplicateCheck = false) => {
    if (!activeRecipe) return;

    if (!bypassDuplicateCheck && !activeRecipe.id) {
      setIsCheckingDuplicates(true);
      try {
        const res = await fetch('/api/recipes?filter=all', { headers: getHeaders() });
        const allRecipes = await res.json();
        
        if (Array.isArray(allRecipes)) {
          const dups = allRecipes.filter(r => checkSimilarity(activeRecipe, r) > 0.55);
          if (dups.length > 0) {
            setPotentialDuplicates(dups);
            setShowDuplicateWarning(true);
            return;
          }
        }
      } catch (err) {
        console.error('Duplicate check failed', err);
      } finally {
        setIsCheckingDuplicates(false);
      }
    }

    setIsSaving(true);
    try {
      const method = activeRecipe.id ? 'PUT' : 'POST';
      const url = activeRecipe.id ? `/api/recipes/${activeRecipe.id}` : '/api/recipes';
      
      const res = await fetch(url, {
        method,
        headers: getHeaders(),
        body: JSON.stringify(activeRecipe)
      });
      const data = await res.json();
      if (data.success) {
        setActiveRecipe(null);
        setIsEditing(false);
        setShowDuplicateWarning(false);
        fetchRecipes();
        alert(activeRecipe.id ? 'Recipe updated successfully!' : 'Recipe saved successfully!');
      } else {
        alert('Failed to save recipe: ' + data.error);
      }
    } catch (err) {
      alert('Network error while saving.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleScanDuplicates = async () => {
    setIsScanningDuplicates(true);
    setHasScannedDuplicates(false);
    
    try {
      // Fetch ALL recipes across all users for the scan
      const res = await fetch('/api/recipes?filter=all', { headers: getHeaders() });
      const allRecipes = await res.json();
      
      if (!Array.isArray(allRecipes)) {
        throw new Error('Failed to fetch recipes for scan');
      }

      setScannedCount(allRecipes.length);

      const groups: any[] = [];
      const processed = new Set();

      for (let i = 0; i < allRecipes.length; i++) {
        if (processed.has(allRecipes[i].id)) continue;
        const group = [allRecipes[i]];
        for (let j = i + 1; j < allRecipes.length; j++) {
          if (processed.has(allRecipes[j].id)) continue;
          if (checkSimilarity(allRecipes[i], allRecipes[j]) > 0.55) {
            group.push(allRecipes[j]);
            processed.add(allRecipes[j].id);
          }
        }
        if (group.length > 1) {
          groups.push(group);
        }
        processed.add(allRecipes[i].id);
      }
      setDuplicateGroups(groups);
      setHasScannedDuplicates(true);
    } catch (err) {
      console.error(err);
      alert('Error scanning for duplicates across all recipes.');
    } finally {
      setIsScanningDuplicates(false);
    }
  };

  const handleMergeRecipes = async (targetId: string, sourceIds: string[]) => {
    if (!confirm(`Are you sure you want to merge ${sourceIds.length} recipes into the target? Sources will be deleted.`)) return;
    
    try {
      // In a real app, this would be a single atomic transaction on the server.
      // Here we'll simulate it by deleting sources.
      for (const id of sourceIds) {
        await fetch(`/api/recipes/${id}`, {
          method: 'DELETE',
          headers: getHeaders()
        });
      }
      
      setDuplicateGroups(prev => prev.filter(g => !g.some((r: any) => r.id === targetId)));
      fetchRecipes();
      alert('Recipes merged successfully (sources deleted).');
    } catch (err) {
      alert('Error during merge.');
    }
  };

  const handleDeleteRecipe = async (id: string) => {
    if (!confirm('Are you sure you want to delete this recipe?')) return;
    try {
      const res = await fetch(`/api/recipes/${id}`, {
        method: 'DELETE',
        headers: getHeaders()
      });
      const data = await res.json();
      if (data.success) {
        fetchRecipes();
      } else {
        alert('Failed to delete recipe: ' + data.error);
      }
    } catch (e) {
      alert('Network error.');
    }
  };

  const handleExportCookbook = async () => {
    if (selectedRecipes.size === 0) return alert('Select at least one recipe');
    setIsExporting(true);
    try {
      const res = await fetch('/api/recipes/export/cookbook', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ 
          recipeIds: Array.from(selectedRecipes), 
          options: exportOptions 
        })
      });
      
      if (!res.ok) throw new Error('Export failed');
      
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Cookbook_${exportOptions.design}.docx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      setShowExportOptions(false);
    } catch (err) {
      alert('Failed to export cookbook');
    } finally {
      setIsExporting(false);
    }
  };

  const toggleRecipeSelection = (id: string) => {
    const newSelection = new Set(selectedRecipes);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedRecipes(newSelection);
  };

  const displayedRecipes = recipes
    .filter(r => {
      if (recipeFilter === 'all') return true;
      if (recipeFilter === 'none') return !r.category;
      return r.category === recipeFilter;
    })
    .filter(r => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      const inTitle = r.title.toLowerCase().includes(query);
      const inAuthor = r.author?.username?.toLowerCase().includes(query);
      const inIngredients = r.ingredients?.some((ing: any) => 
        ing.name.toLowerCase().includes(query) || 
        (ing.notes && ing.notes.toLowerCase().includes(query))
      );
      return inTitle || inAuthor || inIngredients;
    })
    .sort((a, b) => {
      if (recipeSort === 'newest') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (recipeSort === 'oldest') return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      if (recipeSort === 'alpha') return a.title.localeCompare(b.title);
      return 0;
    });

  const handleSelectAll = () => {
    if (displayedRecipes.length === 0) return;
    const allIds = displayedRecipes.map(r => r.id);
    const allSelected = allIds.every(id => selectedRecipes.has(id));
    
    const newSelection = new Set(selectedRecipes);
    if (allSelected) {
      allIds.forEach(id => newSelection.delete(id));
    } else {
      allIds.forEach(id => newSelection.add(id));
    }
    setSelectedRecipes(newSelection);
  };

  if (view === 'login' || !user) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4 text-zinc-100 font-sans">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md bg-zinc-900 border border-zinc-800 p-8 rounded-2xl shadow-2xl"
        >
          <div className="flex items-center justify-center mb-8">
            <ChefHat className="w-12 h-12 text-emerald-500 mr-3" />
            <h1 className="text-3xl font-serif tracking-tight">CulinaryBase</h1>
          </div>
          
          <form onSubmit={handleAuth} className="space-y-4">
            {authError && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg text-sm">
                {authError}
              </div>
            )}
            
            {authMode === 'login' ? (
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Username or Email</label>
                <input 
                  type="text" 
                  value={loginId}
                  onChange={e => setLoginId(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 focus:outline-none focus:border-emerald-500 transition-colors"
                  required
                />
              </div>
            ) : (
              <>
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1">Email</label>
                  <input 
                    type="email" 
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 focus:outline-none focus:border-emerald-500 transition-colors"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1">Username</label>
                  <input 
                    type="text" 
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 focus:outline-none focus:border-emerald-500 transition-colors"
                    required
                  />
                </div>
              </>
            )}
            
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">Password</label>
              <input 
                type="password" 
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 focus:outline-none focus:border-emerald-500 transition-colors"
                required
              />
            </div>
            
            <button 
              type="submit"
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-2.5 rounded-lg transition-colors mt-6"
            >
              {authMode === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </form>
          
          <div className="mt-6 text-center text-sm text-zinc-500">
            {authMode === 'login' ? "Don't have an account? " : "Already have an account? "}
            <button 
              onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
              className="text-emerald-500 hover:text-emerald-400 font-medium"
            >
              {authMode === 'login' ? 'Sign up' : 'Sign in'}
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-zinc-950 text-zinc-100 overflow-hidden relative">
      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsMobileMenuOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside 
        className={`
          fixed inset-y-0 left-0 z-50 lg:relative lg:z-0
          ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          ${isSidebarCollapsed ? 'lg:w-20' : 'lg:w-64'}
          bg-zinc-900 border-r border-zinc-800 flex flex-col transition-all duration-300 ease-in-out shrink-0
        `}
      >
        <div className={`h-16 border-b border-zinc-800 flex items-center shrink-0 ${isSidebarCollapsed ? 'justify-center' : 'px-6 justify-between'}`}>
          {!isSidebarCollapsed && (
            <div className="flex items-center gap-3 overflow-hidden">
              <ChefHat className="text-emerald-500 shrink-0" size={28} />
              <span className="font-serif text-xl font-bold tracking-tight truncate">CulinaryBase</span>
            </div>
          )}
          {isSidebarCollapsed && (
             <ChefHat className="text-emerald-500 shrink-0 lg:hidden" size={28} />
          )}
          
          <button 
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className={`hidden lg:flex p-2 hover:bg-zinc-800 rounded-lg text-zinc-500 hover:text-zinc-300 transition-colors`}
            title={isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            <Layout size={20} />
          </button>

          <button 
            onClick={() => setIsMobileMenuOpen(false)}
            className="lg:hidden p-2 hover:bg-zinc-800 rounded-lg text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 py-4 px-3 space-y-2 overflow-y-auto overflow-x-hidden">
          {[
            { id: 'importer', icon: Zap, label: 'Recipe Importer' },
            { id: 'cookbook', icon: BookOpen, label: 'Cookbook' },
            { id: 'settings', icon: Settings, label: 'Settings' },
            { id: 'admin', icon: ShieldAlert, label: 'Admin', adminOnly: true },
          ].map(item => {
            if (item.adminOnly && user?.role !== 'Admin') return null;
            const Icon = item.icon;
            const isActive = view === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => {
                  setView(item.id as ViewState);
                  setIsMobileMenuOpen(false);
                }}
                className={`
                  w-full flex items-center rounded-xl transition-all group relative
                  ${isSidebarCollapsed ? 'justify-center py-3' : 'gap-3 px-3 py-2.5'}
                  ${isActive 
                    ? 'bg-emerald-600/10 text-emerald-500 font-medium' 
                    : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'}
                `}
                title={isSidebarCollapsed ? item.label : ''}
              >
                <Icon size={20} className={`shrink-0 ${isActive ? 'text-emerald-500' : 'group-hover:scale-110 transition-transform'}`} />
                {!isSidebarCollapsed && <span className="truncate">{item.label}</span>}
              </button>
            );
          })}
        </nav>

        <div className="p-3 border-t border-zinc-800 space-y-2 shrink-0">
          <div className={`flex items-center ${isSidebarCollapsed ? 'justify-center py-2' : 'gap-3 px-3 py-2'}`}>
            <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-sm font-bold shrink-0 text-white">
              {user?.username?.[0]?.toUpperCase()}
            </div>
            {!isSidebarCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user?.username}</p>
                <p className="text-[10px] text-zinc-500 uppercase tracking-wider truncate">{user?.role}</p>
              </div>
            )}
          </div>
          <button 
            onClick={() => {
              localStorage.removeItem('session_token');
              setToken(null);
              setUser(null);
              setView('login');
            }}
            className={`
              w-full flex items-center rounded-xl text-zinc-500 hover:bg-red-500/10 hover:text-red-400 transition-all
              ${isSidebarCollapsed ? 'justify-center py-3' : 'gap-3 px-3 py-2'}
            `}
            title={isSidebarCollapsed ? 'Logout' : ''}
          >
            <LogOut size={20} className="shrink-0" />
            {!isSidebarCollapsed && <span className="text-sm truncate">Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile Header */}
        <header className="lg:hidden h-16 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between px-4 shrink-0">
          <div className="flex items-center gap-2">
            <ChefHat className="text-emerald-500" size={24} />
            <span className="font-serif text-lg font-bold tracking-tight">CulinaryBase</span>
          </div>
          <button 
            onClick={() => setIsMobileMenuOpen(true)}
            className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <Layout size={24} />
          </button>
        </header>

        <main className="flex-1 overflow-auto">
          <div className="max-w-5xl mx-auto p-4 md:p-8">
          <AnimatePresence mode="wait">
            
            {/* IMPORTER VIEW */}
            {view === 'importer' && (
              <motion.div 
                key="importer"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-8"
              >
                <div className="flex justify-between items-end">
                  <div>
                    <h1 className="text-3xl font-serif tracking-tight mb-2">Recipe Importer</h1>
                    <p className="text-zinc-400 text-sm">Add recipes from any source or enter them manually.</p>
                  </div>
                </div>
                {!isAiConfigured && (
                    <div className="mt-4 p-4 bg-amber-900/20 border border-amber-900/50 rounded-xl flex items-start gap-3">
                      <ShieldAlert className="text-amber-500 shrink-0" size={20} />
                      <div>
                        <p className="text-sm font-medium text-amber-200">AI Not Configured</p>
                        <p className="text-xs text-amber-400 mt-1">Please go to the Admin Panel and provide a Gemini API Key to enable recipe extraction.</p>
                      </div>
                    </div>
                  )}

                {!activeRecipe ? (
                  <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
                    {isImporting ? (
                      <div className="py-12 text-center space-y-6">
                        <div className="relative inline-block">
                          <Loader2 className="animate-spin text-emerald-500 mx-auto" size={48} />
                          <div className="absolute inset-0 bg-emerald-500/20 blur-xl rounded-full animate-pulse" />
                        </div>
                        <div className="space-y-2">
                          <h3 className="text-xl font-serif">Extracting Recipe...</h3>
                          <p className="text-zinc-400 text-sm animate-pulse">{extractionStatus || 'Analyzing content and formatting ingredients...'}</p>
                        </div>
                        <div className="max-w-xs mx-auto bg-zinc-800 h-1 rounded-full overflow-hidden">
                          <motion.div 
                            className="bg-emerald-500 h-full"
                            initial={{ width: '0%' }}
                            animate={{ width: '100%' }}
                            transition={{ duration: 15, ease: "linear" }}
                          />
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex gap-2 mb-6">
                      {(['url', 'text', 'image', 'manual'] as ImportType[]).map(type => (
                        <button
                          key={type}
                          onClick={() => {
                            setImportType(type);
                            setImportInput('');
                          }}
                          className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-colors flex items-center gap-2 ${importType === type ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'}`}
                        >
                          {type === 'url' && <LinkIcon size={16} />}
                          {type === 'text' && <FileText size={16} />}
                          {type === 'image' && <ImageIcon size={16} />}
                          {type === 'manual' && <Edit2 size={16} />}
                          {type}
                        </button>
                      ))}
                    </div>

                    <div className="space-y-4">
                      {importType === 'url' && (
                        <input 
                          type="url" 
                          placeholder="https://example.com/recipe" 
                          value={importInput}
                          onChange={e => setImportInput(e.target.value)}
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500 transition-colors text-zinc-200"
                        />
                      )}
                      
                      {importType === 'text' && (
                        <textarea 
                          placeholder="Paste recipe text here..." 
                          value={importInput}
                          onChange={e => setImportInput(e.target.value)}
                          className="w-full h-48 bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500 transition-colors text-zinc-200 resize-none font-mono text-sm"
                        />
                      )}

                      {importType === 'image' && (
                        <div className="space-y-4">
                          <div className="border-2 border-dashed border-zinc-800 rounded-xl p-12 flex flex-col items-center justify-center gap-4 hover:border-emerald-500/50 transition-colors cursor-pointer bg-zinc-950/30 group relative">
                            <input 
                              type="file" 
                              accept="image/*"
                              className="absolute inset-0 opacity-0 cursor-pointer"
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  const reader = new FileReader();
                                  reader.onloadend = () => {
                                    setImportInput(reader.result as string);
                                  };
                                  reader.readAsDataURL(file);
                                }
                              }}
                            />
                            {importInput && importInput.startsWith('data:image') ? (
                              <div className="relative w-full max-w-xs aspect-video rounded-lg overflow-hidden border border-zinc-800">
                                <img src={importInput} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                <button 
                                  onClick={(e) => { e.stopPropagation(); setImportInput(''); }}
                                  className="absolute top-2 right-2 p-1 bg-black/50 rounded-full hover:bg-black/80 text-white"
                                >
                                  <X size={14} />
                                </button>
                              </div>
                            ) : (
                              <>
                                <div className="w-12 h-12 rounded-full bg-zinc-900 flex items-center justify-center text-zinc-500 group-hover:text-emerald-500 transition-colors">
                                  <Upload size={24} />
                                </div>
                                <div className="text-center">
                                  <p className="text-sm font-medium text-zinc-300">Click or drag to upload recipe photo</p>
                                  <p className="text-xs text-zinc-500 mt-1">Supports JPG, PNG, WEBP</p>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      )}

                      {importType !== 'manual' && (
                        <>
                          <div className="flex items-center gap-3 pt-2">
                            <label className="flex items-center gap-2 cursor-pointer group">
                              <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${useWebSearch ? 'bg-emerald-600 border-emerald-600' : 'border-zinc-700 group-hover:border-zinc-500'}`}>
                                {useWebSearch && <Check size={14} className="text-white" />}
                              </div>
                              <input 
                                type="checkbox" 
                                className="hidden" 
                                checked={useWebSearch} 
                                onChange={e => setUseWebSearch(e.target.checked)} 
                              />
                              <span className="text-sm text-zinc-400 group-hover:text-zinc-300 flex items-center gap-1.5">
                                <Globe size={14} />
                                Use AI Web Search to enrich missing details & find cover photo
                              </span>
                            </label>
                          </div>

                          <div className="flex justify-end pt-4">
                            <button 
                              onClick={handleImport}
                              disabled={isImporting || !importInput}
                              className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:hover:bg-emerald-600 text-white px-6 py-2.5 rounded-lg font-medium transition-colors flex items-center gap-2"
                            >
                              {isImporting ? <Loader2 className="animate-spin" size={18} /> : <Search size={18} />}
                              {isImporting ? 'Extracting...' : 'Extract Recipe'}
                            </button>
                          </div>
                        </>
                      )}

                      {importType === 'manual' && (
                        <div className="py-8 text-center space-y-6">
                          <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto">
                            <Plus className="text-emerald-500" size={32} />
                          </div>
                          <div className="space-y-2">
                            <h3 className="text-xl font-serif">Start Manual Entry</h3>
                            <p className="text-zinc-400 text-sm max-w-xs mx-auto">Enter your recipe details manually using our structured editor.</p>
                          </div>
                          <button 
                            onClick={handleStartManualEntry}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-3 rounded-xl font-medium transition-all shadow-lg shadow-emerald-900/20"
                          >
                            Create New Recipe
                          </button>
                        </div>
                      )}
                    </div>
                    </>
                  )}
                </div>
              ) : (
                  <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
                    <div className="p-6 border-b border-zinc-800 flex justify-between items-center bg-zinc-950/50">
                      <h2 className="text-xl font-serif">{activeRecipe.id ? 'Edit Recipe' : (activeRecipe.title === '' && activeRecipe.instructions === '' ? 'New Recipe' : 'Review Recipe')}</h2>
                      <div className="flex gap-3">
                        <button 
                          onClick={() => { setActiveRecipe(null); setIsEditing(false); }}
                          className="px-4 py-2 rounded-lg text-sm font-medium text-zinc-400 hover:text-zinc-200 transition-colors"
                        >
                          Discard
                        </button>
                        <button 
                          onClick={() => handleSaveRecipe()}
                          disabled={isSaving || isCheckingDuplicates}
                          className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                        >
                          {(isSaving || isCheckingDuplicates) ? <Loader2 className="animate-spin" size={16} /> : <Check size={16} />}
                          {isCheckingDuplicates ? 'Checking Duplicates...' : (isSaving ? 'Saving...' : (activeRecipe.id ? 'Update Recipe' : 'Save Recipe'))}
                        </button>
                      </div>
                    </div>
                    
                    <div className="p-6 space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="col-span-2 md:col-span-1">
                          <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Title</label>
                          <input 
                            type="text" 
                            value={activeRecipe.title || ''}
                            onChange={e => setActiveRecipe({...activeRecipe, title: e.target.value})}
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-lg font-serif focus:outline-none focus:border-emerald-500"
                            required
                          />
                        </div>
                        <div className="col-span-2 md:col-span-1">
                          <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Recipe Image</label>
                          <div className="flex gap-2 items-start">
                            <div className="relative group w-24 h-24 bg-zinc-900 rounded-lg border border-zinc-800 overflow-hidden flex-shrink-0">
                              {activeRecipe.imageUrl ? (
                                <img src={activeRecipe.imageUrl} alt="Recipe" className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-zinc-600">
                                  <ImageIcon size={24} />
                                </div>
                              )}
                            </div>
                            <div className="flex-1">
                              <div className="flex gap-2 mb-2">
                                <button 
                                  onClick={() => {
                                    setShowImagePicker(true);
                                    if (activeRecipe.title && suggestedImages.length === 0) {
                                      handleSuggestImages();
                                    }
                                  }}
                                  className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-3 py-2 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-2"
                                >
                                  <ImageIcon size={14} /> Select / Upload
                                </button>
                                <button 
                                  onClick={handleSuggestImages}
                                  disabled={isImporting || !activeRecipe.title}
                                  className="bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-400 px-3 py-2 rounded-lg text-xs font-medium transition-colors flex items-center gap-1"
                                  title="Find images using AI"
                                >
                                  <Sparkles size={14} /> AI Suggest
                                </button>
                                {activeRecipe.imageUrl && (
                                  <button 
                                    onClick={() => setActiveRecipe({...activeRecipe, imageUrl: ''})}
                                    className="bg-red-500/10 hover:bg-red-500/20 text-red-400 px-3 py-2 rounded-lg text-xs font-medium transition-colors flex items-center gap-1"
                                    title="Remove current image"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                )}
                              </div>
                              <input 
                                type="text" 
                                value={activeRecipe.imageUrl || ''}
                                onChange={e => setActiveRecipe({...activeRecipe, imageUrl: e.target.value})}
                                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-500 focus:outline-none focus:border-emerald-500"
                                placeholder="Or paste URL directly..."
                              />
                            </div>
                          </div>
                        </div>
                        <div className="col-span-2 md:col-span-1">
                          <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Category</label>
                          <div className="flex gap-2">
                            <select 
                              value={activeRecipe.category || ''}
                              onChange={e => {
                                if (e.target.value === 'ADD_NEW') {
                                  const newCat = prompt('Enter new category:');
                                  if (newCat) {
                                    setActiveRecipe({...activeRecipe, category: newCat});
                                  }
                                } else {
                                  setActiveRecipe({...activeRecipe, category: e.target.value});
                                }
                              }}
                              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-lg font-serif focus:outline-none focus:border-emerald-500"
                            >
                              <option value="">Select Category</option>
                              {Array.from(new Set(recipes.map(r => r.category).filter(Boolean))).sort().map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                              ))}
                              <option value="ADD_NEW" className="text-emerald-400 font-bold">+ Add New Category...</option>
                            </select>
                            <button 
                              onClick={handleSuggestCategory}
                              disabled={isSuggestingCategory || !activeRecipe.title}
                              className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-3 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap flex items-center gap-1 min-w-[70px] justify-center"
                              title="Suggest Category with AI"
                            >
                              {isSuggestingCategory ? (
                                <Loader2 size={14} className="animate-spin" />
                              ) : (
                                <><Sparkles size={14} /> Auto</>
                              )}
                            </button>
                          </div>
                        </div>
                        {user?.role === 'Admin' && (
                          <div className="col-span-2">
                            <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Recipe Owner (Admin Only)</label>
                            <select
                              value={activeRecipe.authorId || user.id}
                              onChange={e => setActiveRecipe({...activeRecipe, authorId: e.target.value})}
                              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-emerald-500"
                            >
                              {users.map(u => (
                                <option key={u.id} value={u.id}>{u.username} ({u.email})</option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Prep Time (min)</label>
                          <input 
                            type="number" 
                            value={activeRecipe.prepTime || ''}
                            onChange={e => setActiveRecipe({...activeRecipe, prepTime: parseInt(e.target.value)})}
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 focus:outline-none focus:border-emerald-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Cook Time (min)</label>
                          <input 
                            type="number" 
                            value={activeRecipe.cookTime || ''}
                            onChange={e => setActiveRecipe({...activeRecipe, cookTime: parseInt(e.target.value)})}
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 focus:outline-none focus:border-emerald-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Yield</label>
                          <input 
                            type="text" 
                            value={activeRecipe.yield || ''}
                            onChange={e => setActiveRecipe({...activeRecipe, yield: e.target.value})}
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 focus:outline-none focus:border-emerald-500"
                          />
                        </div>
                      </div>

                      <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-xl p-4">
                        <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                          <Droplets size={14} className="text-emerald-500" />
                          Nutrition (per serving)
                        </label>
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                          <div>
                            <label className="block text-[10px] font-semibold text-zinc-600 uppercase mb-1">Calories</label>
                            <input 
                              type="number" 
                              value={activeRecipe.calories || ''}
                              onChange={e => setActiveRecipe({...activeRecipe, calories: parseInt(e.target.value) || 0})}
                              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-emerald-500"
                              placeholder="0"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-semibold text-zinc-600 uppercase mb-1">Protein (g)</label>
                            <input 
                              type="number" 
                              step="0.1"
                              value={activeRecipe.protein || ''}
                              onChange={e => setActiveRecipe({...activeRecipe, protein: parseFloat(e.target.value) || 0})}
                              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-emerald-500"
                              placeholder="0"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-semibold text-zinc-600 uppercase mb-1">Carbs (g)</label>
                            <input 
                              type="number" 
                              step="0.1"
                              value={activeRecipe.carbs || ''}
                              onChange={e => setActiveRecipe({...activeRecipe, carbs: parseFloat(e.target.value) || 0})}
                              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-emerald-500"
                              placeholder="0"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-semibold text-zinc-600 uppercase mb-1">Fat (g)</label>
                            <input 
                              type="number" 
                              step="0.1"
                              value={activeRecipe.fat || ''}
                              onChange={e => setActiveRecipe({...activeRecipe, fat: parseFloat(e.target.value) || 0})}
                              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-emerald-500"
                              placeholder="0"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-semibold text-zinc-600 uppercase mb-1">Fiber (g)</label>
                            <input 
                              type="number" 
                              step="0.1"
                              value={activeRecipe.fiber || ''}
                              onChange={e => setActiveRecipe({...activeRecipe, fiber: parseFloat(e.target.value) || 0})}
                              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-emerald-500"
                              placeholder="0"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                          <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-4">Ingredients</label>
                          <div className="space-y-2">
                            {activeRecipe.ingredients?.map((ing: any, idx: number) => (
                              <div key={idx} className="flex gap-2 items-start">
                                <input 
                                  type="text" 
                                  value={ing.amount || ''}
                                  onChange={e => {
                                    const newIngs = [...activeRecipe.ingredients];
                                    newIngs[idx].amount = e.target.value;
                                    setActiveRecipe({...activeRecipe, ingredients: newIngs});
                                  }}
                                  className="w-16 bg-zinc-950 border border-zinc-800 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:border-emerald-500"
                                  placeholder="Amt"
                                />
                                <input 
                                  type="text" 
                                  value={ing.unit || ''}
                                  onChange={e => {
                                    const newIngs = [...activeRecipe.ingredients];
                                    newIngs[idx].unit = e.target.value;
                                    setActiveRecipe({...activeRecipe, ingredients: newIngs});
                                  }}
                                  className="w-20 bg-zinc-950 border border-zinc-800 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:border-emerald-500"
                                  placeholder="Unit"
                                />
                                <input 
                                  type="text" 
                                  value={ing.name || ''}
                                  onChange={e => {
                                    const newIngs = [...activeRecipe.ingredients];
                                    newIngs[idx].name = e.target.value;
                                    setActiveRecipe({...activeRecipe, ingredients: newIngs});
                                  }}
                                  className="flex-1 bg-zinc-950 border border-zinc-800 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:border-emerald-500"
                                  placeholder="Ingredient name"
                                />
                                <button 
                                  onClick={() => {
                                    const newIngs = activeRecipe.ingredients.filter((_: any, i: number) => i !== idx);
                                    setActiveRecipe({...activeRecipe, ingredients: newIngs});
                                  }}
                                  className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-colors"
                                  title="Remove ingredient"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            ))}
                            <button 
                              onClick={() => {
                                const newIngs = [...(activeRecipe.ingredients || []), { name: '', amount: '', unit: '', notes: '' }];
                                setActiveRecipe({...activeRecipe, ingredients: newIngs});
                              }}
                              className="w-full py-2 border border-dashed border-zinc-800 rounded-lg text-zinc-500 hover:text-emerald-400 hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all text-xs font-medium flex items-center justify-center gap-2"
                            >
                              <Plus size={14} />
                              Add Ingredient
                            </button>
                          </div>
                        </div>
                        
                        <div>
                          <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-4">Instructions</label>
                          <textarea 
                            value={typeof activeRecipe.instructions === 'string' ? activeRecipe.instructions : JSON.stringify(activeRecipe.instructions, null, 2)}
                            onChange={e => setActiveRecipe({...activeRecipe, instructions: e.target.value})}
                            className="w-full h-64 bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 resize-none"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* COOKBOOK VIEW */}
            {view === 'cookbook' && (
              <motion.div 
                key="cookbook"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-8"
              >
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-zinc-900 pb-6 gap-4">
                  <div className="flex-1 w-full max-w-2xl">
                    <h1 className="text-3xl font-serif tracking-tight mb-2">
                      {recipeOwnershipFilter === 'mine' ? 'My Cookbook' : 'Global Cookbook'}
                    </h1>
                    <p className="text-zinc-400 text-sm mb-6">
                      {recipeOwnershipFilter === 'mine' 
                        ? 'Manage and export your personal recipe collection.' 
                        : 'Discover and export recipes from the entire community.'}
                    </p>
                    <div className="relative w-full">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                      <input 
                        type="text" 
                        placeholder="Search recipes, ingredients, or authors..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500 transition-all"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
                    <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-lg p-1">
                      <button 
                        onClick={handleSelectAll}
                        className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${displayedRecipes.length > 0 && displayedRecipes.every(r => selectedRecipes.has(r.id)) ? 'bg-emerald-500 text-zinc-950' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'}`}
                      >
                        {displayedRecipes.length > 0 && displayedRecipes.every(r => selectedRecipes.has(r.id)) ? 'Deselect All' : 'Select All'}
                      </button>
                    </div>
                    <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-lg p-1">
                      <button 
                        onClick={() => setRecipeOwnershipFilter('mine')} 
                        className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${recipeOwnershipFilter === 'mine' ? 'bg-zinc-800 text-emerald-400' : 'text-zinc-500 hover:text-zinc-300'}`}
                      >
                        My Recipes
                      </button>
                      <button 
                        onClick={() => setRecipeOwnershipFilter('all')} 
                        className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${recipeOwnershipFilter === 'all' ? 'bg-zinc-800 text-emerald-400' : 'text-zinc-500 hover:text-zinc-300'}`}
                      >
                        Global
                      </button>
                    </div>
                    <select 
                      value={recipeFilter}
                      onChange={(e) => setRecipeFilter(e.target.value)}
                      className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
                    >
                      <option value="all">All Categories</option>
                      <option value="none">No Category</option>
                      {Array.from(new Set(recipes.map(r => r.category).filter(Boolean))).map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                    <select 
                      value={recipeSort}
                      onChange={(e) => setRecipeSort(e.target.value as any)}
                      className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
                    >
                      <option value="newest">Newest First</option>
                      <option value="oldest">Oldest First</option>
                      <option value="alpha">Alphabetical</option>
                    </select>
                    <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-lg p-1">
                      <button onClick={() => setRecipeViewMode('grid')} className={`p-1.5 rounded-md ${recipeViewMode === 'grid' ? 'bg-zinc-800 text-emerald-400' : 'text-zinc-500 hover:text-zinc-300'}`}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
                      </button>
                      <button onClick={() => setRecipeViewMode('list')} className={`p-1.5 rounded-md ${recipeViewMode === 'list' ? 'bg-zinc-800 text-emerald-400' : 'text-zinc-500 hover:text-zinc-300'}`}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>
                      </button>
                    </div>
                    <button 
                      onClick={() => setShowExportOptions(true)}
                      disabled={selectedRecipes.size === 0 || isExporting}
                      className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 whitespace-nowrap"
                    >
                      {isExporting ? <Loader2 className="animate-spin" size={16} /> : <Printer size={16} />}
                      Export ({selectedRecipes.size})
                    </button>
                  </div>
                </div>

                <div className={recipeViewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" : "flex flex-col gap-3"}>
                  {displayedRecipes.map(recipe => (
                    <div 
                      key={recipe.id}
                      className={`p-4 rounded-xl border transition-all flex ${recipeViewMode === 'grid' ? 'flex-col' : 'flex-row items-center justify-between'} ${selectedRecipes.has(recipe.id) ? 'bg-emerald-900/20 border-emerald-500/50' : 'bg-zinc-900/50 border-zinc-800 hover:border-zinc-700'}`}
                    >
                      <div className={`flex-1 ${recipeViewMode === 'grid' ? 'mb-4' : ''}`}>
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <button 
                              onClick={(e) => { e.stopPropagation(); setViewingRecipe(recipe); }}
                              className="text-left group"
                            >
                              <h3 className="font-serif text-lg leading-tight mb-1 group-hover:text-emerald-400 transition-colors">{recipe.title}</h3>
                            </button>
                            <p className="text-[10px] text-zinc-500 italic">by {recipe.author?.username || 'Unknown'}</p>
                          </div>
                          {recipe.category && <span className="text-[10px] uppercase tracking-wider bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full whitespace-nowrap">{recipe.category}</span>}
                        </div>
                        <div className="flex items-center gap-4 text-xs text-zinc-500 mt-2">
                          <span className="flex items-center gap-1"><Clock size={12} /> {(recipe.prepTime || 0) + (recipe.cookTime || 0)}m</span>
                          <span className="flex items-center gap-1"><Users size={12} /> {recipe.yield || 'N/A'}</span>
                          {recipe.calories && (
                            <span className="flex items-center gap-1 text-emerald-500/80">
                              <Droplets size={12} /> {recipe.calories} kcal
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className={`flex items-center gap-3 ${recipeViewMode === 'grid' ? 'w-full justify-between mt-auto pt-4 border-t border-zinc-800/50' : ''}`}>
                        <div className="flex items-center gap-2">
                          {(recipe.authorId === user?.id || user?.role === 'Admin') && (
                            <>
                              <button 
                                onClick={(e) => { 
                                  e.stopPropagation(); 
                                  setActiveRecipe(recipe); 
                                  setIsEditing(true);
                                  setView('importer');
                                }}
                                className="text-sm text-zinc-400 hover:text-blue-400 transition-colors flex items-center gap-1"
                              >
                                <Edit2 size={14} /> Edit
                              </button>
                              <button 
                                onClick={(e) => { e.stopPropagation(); handleDeleteRecipe(recipe.id); }}
                                className="text-sm text-zinc-400 hover:text-red-400 transition-colors flex items-center gap-1"
                              >
                                <Trash2 size={14} /> Delete
                              </button>
                            </>
                          )}
                        </div>
                        <button 
                          onClick={(e) => { e.stopPropagation(); toggleRecipeSelection(recipe.id); }}
                          className={`flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg border transition-colors ${selectedRecipes.has(recipe.id) ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-zinc-800/50 border-zinc-700 text-zinc-300 hover:bg-zinc-800'}`}
                        >
                          <div className={`w-4 h-4 rounded-full border flex items-center justify-center flex-shrink-0 ${selectedRecipes.has(recipe.id) ? 'bg-emerald-500 border-emerald-500' : 'border-zinc-500'}`}>
                            {selectedRecipes.has(recipe.id) && <Check size={10} className="text-zinc-950" />}
                          </div>
                          {selectedRecipes.has(recipe.id) ? 'Selected' : 'Select'}
                        </button>
                      </div>
                    </div>
                  ))}
                  {recipes.length === 0 && (
                    <div className="col-span-full text-center py-12 text-zinc-500">
                      No recipes found. Import some first!
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* VIEW RECIPE MODAL */}
            {viewingRecipe && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl"
                >
                  <div className="sticky top-0 bg-zinc-900/90 backdrop-blur border-b border-zinc-800 p-4 flex items-center justify-between z-10">
                    <h2 className="text-xl font-serif">{viewingRecipe.title}</h2>
                    <div className="flex items-center gap-2">
                      {(viewingRecipe.authorId === user?.id || user?.role === 'Admin') && (
                        <button 
                          onClick={() => {
                            setActiveRecipe(viewingRecipe);
                            setIsEditing(true);
                            setView('importer');
                            setViewingRecipe(null);
                          }}
                          className="flex items-center gap-2 text-sm bg-zinc-800 text-zinc-300 border border-zinc-700 px-3 py-1.5 rounded-lg hover:bg-zinc-700 transition-colors"
                        >
                          <Edit2 size={14} />
                          Edit
                        </button>
                      )}
                      <button 
                        onClick={() => handleSearchSimilar(viewingRecipe.id)}
                        disabled={isSearchingSimilar}
                        className="flex items-center gap-2 text-sm bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 px-3 py-1.5 rounded-lg hover:bg-emerald-600/30 transition-colors"
                      >
                        {isSearchingSimilar ? <Loader2 size={14} className="animate-spin" /> : <Wand2 size={14} />}
                        Find Similar
                      </button>
                      <button onClick={() => setViewingRecipe(null)} className="p-2 hover:bg-zinc-800 rounded-full text-zinc-400 hover:text-white transition-colors">
                        <X size={20} />
                      </button>
                    </div>
                  </div>
                  <div className="p-6 space-y-8">
                    {viewingRecipe.imageUrl && (
                      <div className="w-full h-64 rounded-xl overflow-hidden mb-6">
                        <img 
                          src={viewingRecipe.imageUrl} 
                          alt={viewingRecipe.title} 
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      </div>
                    )}
                    {viewingRecipe.description && <p className="text-zinc-300 italic">{viewingRecipe.description}</p>}
                    
                    <div className="flex flex-wrap gap-4 text-sm text-zinc-400 bg-zinc-950/50 p-4 rounded-xl border border-zinc-800/50">
                      {viewingRecipe.prepTime && <div><span className="text-zinc-500 uppercase text-xs tracking-wider block mb-1">Prep Time</span>{viewingRecipe.prepTime} mins</div>}
                      {viewingRecipe.cookTime && <div><span className="text-zinc-500 uppercase text-xs tracking-wider block mb-1">Cook Time</span>{viewingRecipe.cookTime} mins</div>}
                      {viewingRecipe.yield && <div><span className="text-zinc-500 uppercase text-xs tracking-wider block mb-1">Yield</span>{viewingRecipe.yield}</div>}
                      {viewingRecipe.category && <div><span className="text-zinc-500 uppercase text-xs tracking-wider block mb-1">Category</span>{viewingRecipe.category}</div>}
                    </div>

                    {(viewingRecipe.calories || viewingRecipe.protein || viewingRecipe.carbs || viewingRecipe.fat) && (
                      <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl p-4">
                        <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                          <Droplets size={12} className="text-emerald-500" />
                          Nutrition per serving
                        </h4>
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                          <div className="flex flex-col">
                            <span className="text-lg font-medium text-white">{viewingRecipe.calories || 0}</span>
                            <span className="text-[10px] text-zinc-500 uppercase">Calories</span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-lg font-medium text-white">{viewingRecipe.protein || 0}g</span>
                            <span className="text-[10px] text-zinc-500 uppercase">Protein</span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-lg font-medium text-white">{viewingRecipe.carbs || 0}g</span>
                            <span className="text-[10px] text-zinc-500 uppercase">Carbs</span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-lg font-medium text-white">{viewingRecipe.fat || 0}g</span>
                            <span className="text-[10px] text-zinc-500 uppercase">Fat</span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-lg font-medium text-white">{viewingRecipe.fiber || 0}g</span>
                            <span className="text-[10px] text-zinc-500 uppercase">Fiber</span>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                      <div className="md:col-span-1 space-y-4">
                        <h3 className="text-lg font-serif border-b border-zinc-800 pb-2">Ingredients</h3>
                        <ul className="space-y-2">
                          {viewingRecipe.ingredients?.map((ing: any, i: number) => (
                            <li key={i} className="text-sm text-zinc-300 flex items-start gap-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0" />
                              <span>
                                {ing.amount && <span className="font-medium text-white mr-1">{formatFraction(ing.amount)}</span>}
                                {ing.unit && <span className="text-zinc-400 mr-1">{ing.unit}</span>}
                                {ing.name}
                                {ing.notes && <span className="text-zinc-500 italic ml-1">({ing.notes})</span>}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className="md:col-span-2 space-y-4">
                        <h3 className="text-lg font-serif border-b border-zinc-800 pb-2">Instructions</h3>
                        <div className="space-y-4">
                          {viewingRecipe.instructions.split('\n').filter((l: string) => l.trim()).map((line: string, i: number) => {
                            const trimmed = line.trim();
                            // Strip existing numbers if present to use our own consistent styling
                            const cleanText = trimmed.replace(/^\d+[\.\)]\s*/, '');
                            return (
                              <div key={i} className="flex gap-4 items-start">
                                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-zinc-800 text-zinc-400 text-[10px] font-bold flex items-center justify-center border border-zinc-700">
                                  {i + 1}
                                </span>
                                <p className="text-sm text-zinc-300 leading-relaxed pt-0.5">
                                  {cleanText}
                                </p>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>
            )}

            {/* DUPLICATE WARNING MODAL */}
            {showDuplicateWarning && (
              <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden"
                >
                  <div className="p-6 border-b border-zinc-800 bg-amber-500/10 flex items-center gap-3">
                    <ShieldAlert className="text-amber-500" size={24} />
                    <div>
                      <h2 className="text-xl font-serif text-amber-200">Potential Duplicates Found</h2>
                      <p className="text-xs text-amber-500/80">We found recipes that look very similar to what you're saving.</p>
                    </div>
                  </div>
                  <div className="p-6 max-h-[60vh] overflow-y-auto space-y-4">
                    {potentialDuplicates.map(dup => (
                      <div key={dup.id} className="p-4 bg-zinc-950 border border-zinc-800 rounded-xl flex justify-between items-center group">
                        <div>
                          <h4 className="font-medium text-zinc-200">{dup.title}</h4>
                          <p className="text-xs text-zinc-500">by {dup.author?.username || 'Unknown'} • {dup.category || 'No Category'}</p>
                        </div>
                        <button 
                          onClick={() => {
                            setViewingRecipe(dup);
                          }}
                          className="text-xs text-emerald-500 hover:underline"
                        >
                          View Recipe
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="p-6 bg-zinc-950 border-t border-zinc-800 flex justify-end gap-3">
                    <button 
                      onClick={() => setShowDuplicateWarning(false)}
                      className="px-4 py-2 text-sm text-zinc-400 hover:text-white transition-colors"
                    >
                      Cancel & Edit
                    </button>
                    <button 
                      onClick={() => handleSaveRecipe(true)}
                      className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition-all"
                    >
                      Save Anyway
                    </button>
                  </div>
                </motion.div>
              </div>
            )}

            {/* ADMIN VIEW */}
            {view === 'admin' && user?.role === 'Admin' && (
              <motion.div 
                key="admin"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-8"
              >
                <div>
                  <h1 className="text-3xl font-serif tracking-tight mb-2">Admin Panel</h1>
                  <p className="text-zinc-400 text-sm">Manage users and system settings.</p>
                </div>

                <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
                  <h2 className="text-lg font-medium mb-4 flex items-center gap-2"><Sparkles className="text-emerald-500" size={18} /> Gemini AI Settings</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-zinc-400 mb-1">Gemini API Key</label>
                      <input 
                        type="password" 
                        placeholder="Enter API Key (Optional if set in environment)"
                        value={geminiApiKey}
                        onChange={e => setGeminiApiKey(e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 focus:outline-none focus:border-emerald-500 transition-colors text-zinc-200"
                      />
                      <p className="text-[10px] text-zinc-500 mt-1">If left blank, the server will use the GEMINI_API_KEY from environment variables.</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-zinc-400 mb-1">Model Selection</label>
                      <select 
                        value={geminiModel}
                        onChange={e => setGeminiModel(e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 focus:outline-none focus:border-emerald-500 transition-colors text-zinc-200"
                      >
                        <option value="gemini-3-flash-preview">Gemini 3 Flash (Fastest)</option>
                        <option value="gemini-3.1-pro-preview">Gemini 3.1 Pro (Most Capable)</option>
                        <option value="gemini-2.5-flash-latest">Gemini 2.5 Flash</option>
                      </select>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-zinc-400 mb-1">Update Check URL</label>
                      <input 
                        type="text" 
                        placeholder="https://raw.githubusercontent.com/.../version.json"
                        value={updateUrl}
                        onChange={e => setUpdateUrl(e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 focus:outline-none focus:border-emerald-500 transition-colors text-zinc-200"
                      />
                      <p className="text-[10px] text-zinc-500 mt-1">The URL to check for new versions of CulinaryBase.</p>
                    </div>
                  </div>
                  <div className="mt-6 flex justify-end">
                    <button 
                      onClick={handleSaveConfig}
                      disabled={isSavingConfig}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                    >
                      {isSavingConfig ? 'Saving...' : 'Save Gemini Settings'}
                    </button>
                  </div>
                </div>

                <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden">
                  <div className="p-6 border-b border-zinc-800 flex justify-between items-center">
                    <h2 className="text-lg font-medium">Duplicate Management</h2>
                    <button 
                      onClick={handleScanDuplicates}
                      disabled={isScanningDuplicates}
                      className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                    >
                      {isScanningDuplicates ? <Loader2 className="animate-spin" size={16} /> : <Search size={16} />}
                      Scan for Duplicates
                    </button>
                  </div>
                  
                  <div className="p-6 space-y-6">
                    {duplicateGroups.length === 0 ? (
                      <div className="text-center py-12 space-y-4">
                        <div className="w-12 h-12 bg-zinc-800 rounded-full flex items-center justify-center mx-auto text-zinc-500">
                          {hasScannedDuplicates ? <Check size={24} className="text-emerald-500" /> : <Search size={24} />}
                        </div>
                        <div className="space-y-1">
                          <p className="text-zinc-400 font-medium">
                            {hasScannedDuplicates 
                              ? "Scan Complete: No Duplicates Found" 
                              : "Duplicate Scan Ready"}
                          </p>
                          <p className="text-xs text-zinc-500 max-w-xs mx-auto">
                            {hasScannedDuplicates 
                              ? `We analyzed all ${scannedCount} recipes across all users and found no significant similarities.` 
                              : "Click the scan button above to analyze your cookbook for potential duplicates."}
                          </p>
                        </div>
                      </div>
                    ) : (
                      duplicateGroups.map((group, idx) => (
                        <div key={idx} className="border border-zinc-800 rounded-xl overflow-hidden bg-zinc-950/30">
                          <div className="p-3 bg-zinc-900/50 border-b border-zinc-800 flex justify-between items-center">
                            <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Group #{idx + 1} ({group.length} recipes)</span>
                            <div className="flex gap-2">
                              <button 
                                onClick={() => setDuplicateGroups(prev => prev.filter((_, i) => i !== idx))}
                                className="text-[10px] text-zinc-500 hover:text-zinc-300 uppercase tracking-tighter"
                              >
                                Ignore Group
                              </button>
                            </div>
                          </div>
                          <div className="divide-y divide-zinc-800">
                            {group.map((recipe: any) => (
                              <div key={recipe.id} className="p-4 flex justify-between items-center hover:bg-zinc-900/20 transition-colors">
                                <div>
                                  <h4 className="font-medium text-zinc-200">{recipe.title}</h4>
                                  <p className="text-xs text-zinc-500">by {recipe.author?.username} • {recipe.category || 'No Category'}</p>
                                </div>
                                <div className="flex gap-2">
                                  <button 
                                    onClick={() => setViewingRecipe(recipe)}
                                    className="p-2 text-zinc-500 hover:text-emerald-400 transition-colors"
                                    title="View"
                                  >
                                    <BookOpen size={16} />
                                  </button>
                                  <button 
                                    onClick={() => {
                                      const sources = group.filter((r: any) => r.id !== recipe.id).map((r: any) => r.id);
                                      handleMergeRecipes(recipe.id, sources);
                                    }}
                                    className="px-3 py-1 bg-emerald-600/10 text-emerald-400 border border-emerald-500/20 rounded text-xs hover:bg-emerald-600/20 transition-colors"
                                  >
                                    Merge Others Into This
                                  </button>
                                  <button 
                                    onClick={() => handleDeleteRecipe(recipe.id)}
                                    className="p-2 text-zinc-500 hover:text-red-400 transition-colors"
                                    title="Delete"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden">
                  <div className="p-6 border-b border-zinc-800 flex justify-between items-center">
                    <h2 className="text-lg font-medium">User Management</h2>
                  </div>
                  
                  <div className="p-6 border-b border-zinc-800 bg-zinc-950/50">
                    <h3 className="text-sm font-medium text-zinc-400 mb-4">Add New User</h3>
                    <form onSubmit={handleAddUser} className="flex flex-wrap items-end gap-4">
                      <div className="flex-1 min-w-[150px]">
                        <label className="block text-xs text-zinc-500 mb-1">Username</label>
                        <input type="text" value={newUsername} onChange={e => setNewUsername(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500" required />
                      </div>
                      <div className="flex-1 min-w-[150px]">
                        <label className="block text-xs text-zinc-500 mb-1">Email</label>
                        <input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500" required />
                      </div>
                      <div className="flex-1 min-w-[150px]">
                        <label className="block text-xs text-zinc-500 mb-1">Password</label>
                        <input type="password" value={newUserPassword} onChange={e => setNewUserPassword(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500" required />
                      </div>
                      <div className="w-32">
                        <label className="block text-xs text-zinc-500 mb-1">Role</label>
                        <select value={newUserRole} onChange={e => setNewUserRole(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500">
                          <option value="User">User</option>
                          <option value="Admin">Admin</option>
                        </select>
                      </div>
                      <button type="submit" className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors h-[38px]">
                        Add User
                      </button>
                    </form>
                    {adminUserMessage && <p className="text-sm mt-3 text-emerald-400">{adminUserMessage}</p>}
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-zinc-950/50 text-zinc-400">
                        <tr>
                          <th className="px-6 py-3 font-medium">Username</th>
                          <th className="px-6 py-3 font-medium">Email</th>
                          <th className="px-6 py-3 font-medium">Role</th>
                          <th className="px-6 py-3 font-medium text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-800">
                        {users.map(u => (
                          <React.Fragment key={u.id}>
                            <tr className="hover:bg-zinc-900/50 transition-colors">
                              <td className="px-6 py-4">{u.username}</td>
                              <td className="px-6 py-4 text-zinc-400">{u.email}</td>
                              <td className="px-6 py-4">
                                <select 
                                  value={u.role} 
                                  onChange={(e) => handleRoleChange(u.id, e.target.value)}
                                  className={`bg-zinc-800 text-xs font-medium rounded px-2 py-1 border border-transparent focus:border-emerald-500 focus:outline-none transition-colors ${u.role === 'Admin' ? 'text-emerald-400' : 'text-zinc-300'}`}
                                >
                                  <option value="User">User</option>
                                  <option value="Admin">Admin</option>
                                </select>
                              </td>
                              <td className="px-6 py-4 text-right">
                                <button onClick={() => setChangingPasswordUserId(changingPasswordUserId === u.id ? null : u.id)} className="text-zinc-500 hover:text-emerald-400 p-1 text-xs underline">Change Password</button>
                                <button className="text-zinc-500 hover:text-red-400 p-1 ml-2"><Trash2 size={16} /></button>
                              </td>
                            </tr>
                            {changingPasswordUserId === u.id && (
                              <tr className="bg-zinc-950/50">
                                <td colSpan={4} className="px-6 py-4">
                                  <div className="flex items-center justify-end gap-3">
                                    <input 
                                      type="password" 
                                      placeholder="New Password" 
                                      value={adminNewPassword}
                                      onChange={e => setAdminNewPassword(e.target.value)}
                                      className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-emerald-500"
                                    />
                                    <button 
                                      onClick={() => handleAdminChangePassword(u.id)}
                                      className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                                    >
                                      Save
                                    </button>
                                    <button 
                                      onClick={() => { setChangingPasswordUserId(null); setAdminNewPassword(''); }}
                                      className="text-zinc-500 hover:text-zinc-300 px-3 py-1.5 text-sm"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden">
                  <div className="p-6 border-b border-zinc-800 flex justify-between items-center">
                    <h2 className="text-lg font-medium">Category Management</h2>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-zinc-950/50 text-zinc-400">
                        <tr>
                          <th className="px-6 py-3 font-medium">Category Name</th>
                          <th className="px-6 py-3 font-medium">Recipe Count</th>
                          <th className="px-6 py-3 font-medium text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-800">
                        {adminCategories.length === 0 ? (
                          <tr>
                            <td colSpan={3} className="px-6 py-8 text-center text-zinc-500 italic">No categories found.</td>
                          </tr>
                        ) : (
                          adminCategories.map(cat => (
                            <tr key={cat.name} className="hover:bg-zinc-900/50 transition-colors">
                              <td className="px-6 py-4 font-medium text-zinc-200">{cat.name}</td>
                              <td className="px-6 py-4 text-zinc-400">{cat.count} recipes</td>
                              <td className="px-6 py-4 text-right">
                                <div className="flex justify-end gap-2">
                                  <button 
                                    onClick={() => handleRenameCategory(cat.name)}
                                    className="p-2 text-zinc-400 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-colors"
                                    title="Rename Category"
                                  >
                                    <Edit2 size={16} />
                                  </button>
                                  <button 
                                    onClick={() => handleDeleteCategory(cat.name)}
                                    className="p-2 text-zinc-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                    title="Remove Category from all recipes"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-lg font-medium flex items-center gap-2"><RefreshCw className={isCheckingUpdate ? 'animate-spin text-emerald-500' : 'text-emerald-500'} size={18} /> System Update</h2>
                      <div className="flex gap-2">
                        <button 
                          onClick={handleCancelUpdate}
                          className="text-[10px] bg-red-500/10 hover:bg-red-500/20 text-red-400 px-2 py-1 rounded transition-colors"
                          title="Force reset the updating state if the system gets stuck"
                        >
                          Force Reset State
                        </button>
                        <button 
                          onClick={checkUpdate}
                          disabled={isCheckingUpdate}
                          className="text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-3 py-1.5 rounded-lg transition-colors"
                        >
                          Check for Updates
                        </button>
                      </div>
                    </div>

                  {updateInfo ? (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 bg-zinc-950/50 rounded-xl border border-zinc-800">
                        <div>
                          <p className="text-sm font-medium text-white">Version Status</p>
                          <p className="text-xs text-zinc-400">Current: {updateInfo.currentVersion} | Latest: {updateInfo.latestVersion}</p>
                        </div>
                        {updateInfo.hasUpdate ? (
                          <span className="px-2 py-1 bg-emerald-500/10 text-emerald-400 text-[10px] font-bold uppercase tracking-wider rounded">Update Available</span>
                        ) : (
                          <span className="px-2 py-1 bg-zinc-800 text-zinc-500 text-[10px] font-bold uppercase tracking-wider rounded">Up to Date</span>
                        )}
                      </div>

                      {updateInfo.hasUpdate && (
                        <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-xl">
                          <h3 className="text-sm font-medium text-emerald-400 mb-2">New Version Available!</h3>
                          <p className="text-xs text-zinc-400 mb-4">{updateInfo.releaseNotes || 'A new version is available with bug fixes and improvements.'}</p>
                          
                          {!isApplyingUpdate ? (
                            <button 
                              onClick={applyUpdate}
                              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                            >
                              <Download size={16} />
                              Apply Update Now
                            </button>
                          ) : (
                            <div className="space-y-4">
                              <div className="flex items-center gap-3 text-emerald-400">
                                <Loader2 className="animate-spin" size={16} />
                                <span className="text-sm font-medium">Applying Update...</span>
                              </div>
                              
                              <div className="bg-black/40 rounded-lg p-3 font-mono text-[10px] text-zinc-400 h-48 overflow-y-auto border border-zinc-800 space-y-1">
                                {updateLogs.map((log, i) => (
                                  <div key={i} className={log.startsWith('ERROR') ? 'text-red-400' : ''}>
                                    {log}
                                  </div>
                                ))}
                                <div id="update-logs-end" />
                              </div>
                              
                              <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                                <motion.div 
                                  className="bg-emerald-500 h-full"
                                  initial={{ width: 0 }}
                                  animate={{ width: '100%' }}
                                  transition={{ duration: 60, ease: "linear" }}
                                />
                              </div>
                              <p className="text-[10px] text-zinc-500 text-center italic">Please do not close this window. The system will restart automatically.</p>
                              <button 
                                onClick={handleCancelUpdate}
                                className="w-full text-red-400 hover:text-red-300 text-xs mt-2 underline"
                              >
                                Cancel Update (Emergency Only)
                              </button>
                            </div>
                          )}
                          {!isApplyingUpdate && (
                            <p className="text-[10px] text-zinc-500 mt-2 text-center italic">Updating will maintain all your recipes, users, and settings.</p>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8 border-2 border-dashed border-zinc-800 rounded-xl">
                      <p className="text-sm text-zinc-500">Click "Check for Updates" to see if a new version is available.</p>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
                    <h3 className="text-lg font-medium mb-4 flex items-center gap-2"><Download size={18} /> System Backup</h3>
                    <p className="text-sm text-zinc-400 mb-6">Download a complete archive of the SQLite database and all uploaded images.</p>
                    <a href={`/api/admin/backup?token=${token}`} className="inline-flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                      Download Backup.zip
                    </a>
                  </div>
                  <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
                    <h3 className="text-lg font-medium mb-4 flex items-center gap-2"><Upload size={18} /> System Restore</h3>
                    <p className="text-sm text-zinc-400 mb-6">Upload a backup.zip to overwrite the current database and images. Will restart the server.</p>
                    <input 
                      type="file" 
                      ref={restoreFileInputRef} 
                      onChange={handleRestore} 
                      className="hidden" 
                      accept=".zip"
                    />
                    <button 
                      onClick={() => restoreFileInputRef.current?.click()}
                      disabled={isRestoring}
                      className="inline-flex items-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                    >
                      {isRestoring ? <Loader2 className="animate-spin" size={16} /> : <Upload size={16} />}
                      Upload & Restore
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* SETTINGS VIEW */}
            {view === 'settings' && (
              <motion.div 
                key="settings"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-8"
              >
                <div>
                  <h1 className="text-3xl font-serif tracking-tight mb-2">Settings</h1>
                  <p className="text-zinc-400 text-sm">Manage your account and preferences.</p>
                </div>
                
                <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 max-w-2xl">
                  <h3 className="text-lg font-medium mb-4">Change Password</h3>
                  <form onSubmit={handleChangePassword} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-zinc-400 mb-1">Current Password</label>
                      <input 
                        type="password" 
                        value={currentPassword}
                        onChange={e => setCurrentPassword(e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 focus:outline-none focus:border-emerald-500 transition-colors text-zinc-200"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-zinc-400 mb-1">New Password</label>
                      <input 
                        type="password" 
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 focus:outline-none focus:border-emerald-500 transition-colors text-zinc-200"
                        required
                      />
                    </div>
                    <button type="submit" className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                      Update Password
                    </button>
                    {passwordMessage && <p className="text-sm mt-3 text-emerald-400">{passwordMessage}</p>}
                  </form>
                </div>

                <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 max-w-2xl">
                  <h3 className="text-lg font-medium mb-4">Data Export</h3>
                  <p className="text-sm text-zinc-400 mb-6">Download all your personal recipes as a JSON file for safekeeping or transferring to another instance.</p>
                  <a href={`/api/user/export?token=${token}`} className="inline-flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                    <FileJson size={16} /> Export My Recipes (JSON)
                  </a>
                </div>
              </motion.div>
            )}

            {/* IMAGE PICKER MODAL */}
            {showImagePicker && (
              <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[80vh]"
                >
                  <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/50">
                    <h2 className="text-lg font-serif">Select Recipe Image</h2>
                    <button onClick={() => setShowImagePicker(false)} className="p-2 hover:bg-zinc-800 rounded-full text-zinc-400 transition-colors">
                      <X size={20} />
                    </button>
                  </div>
                  
                  <div className="flex border-b border-zinc-800">
                    <button 
                      onClick={() => setImagePickerTab('ai')}
                      className={`flex-1 py-3 text-sm font-medium transition-colors border-b-2 ${imagePickerTab === 'ai' ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5' : 'border-transparent text-zinc-400 hover:text-zinc-200'}`}
                    >
                      AI Suggestions
                    </button>
                    <button 
                      onClick={() => setImagePickerTab('upload')}
                      className={`flex-1 py-3 text-sm font-medium transition-colors border-b-2 ${imagePickerTab === 'upload' ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5' : 'border-transparent text-zinc-400 hover:text-zinc-200'}`}
                    >
                      Upload File
                    </button>
                    <button 
                      onClick={() => setImagePickerTab('url')}
                      className={`flex-1 py-3 text-sm font-medium transition-colors border-b-2 ${imagePickerTab === 'url' ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5' : 'border-transparent text-zinc-400 hover:text-zinc-200'}`}
                    >
                      Image URL
                    </button>
                  </div>

                  <div className="p-6 overflow-y-auto flex-1">
                    {imagePickerTab === 'ai' && (
                      <div className="space-y-4">
                        <div className="flex gap-2">
                          <input 
                            type="text" 
                            value={activeRecipe.title || ''}
                            readOnly
                            className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-400"
                            placeholder="Recipe title..."
                          />
                          <button 
                            onClick={handleSuggestImages}
                            disabled={isImporting || !activeRecipe.title}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                          >
                            {isImporting ? <Loader2 className="animate-spin" size={16} /> : <Sparkles size={16} />}
                            Refresh
                          </button>
                        </div>
                        
                        {suggestedImages.length > 0 ? (
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            {suggestedImages.map((img, idx) => (
                              <button 
                                key={idx}
                                onClick={() => {
                                  setActiveRecipe({ ...activeRecipe, imageUrl: img });
                                  setShowImagePicker(false);
                                }}
                                className="group relative aspect-square rounded-xl overflow-hidden border border-zinc-800 hover:border-emerald-500 transition-all"
                              >
                                <img src={img} alt={`Suggestion ${idx}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform" referrerPolicy="no-referrer" />
                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                  <span className="bg-emerald-600 text-white px-3 py-1 rounded-full text-xs font-medium">Select</span>
                                </div>
                              </button>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-12 text-zinc-500 border-2 border-dashed border-zinc-800 rounded-xl">
                            {isImporting ? 'Searching for delicious images...' : 'No suggestions yet. Click Refresh to search.'}
                          </div>
                        )}
                      </div>
                    )}

                    {imagePickerTab === 'upload' && (
                      <div className="flex flex-col items-center justify-center h-full py-12 border-2 border-dashed border-zinc-800 rounded-xl bg-zinc-950/30">
                        <input 
                          type="file" 
                          id="image-upload" 
                          className="hidden" 
                          accept="image/*"
                          onChange={handleFileUpload}
                          disabled={isUploading}
                        />
                        <label 
                          htmlFor="image-upload" 
                          className={`flex flex-col items-center gap-4 cursor-pointer p-8 transition-opacity ${isUploading ? 'opacity-50' : 'hover:opacity-80'}`}
                        >
                          <div className="w-16 h-16 bg-zinc-900 rounded-full flex items-center justify-center border border-zinc-800">
                            {isUploading ? <Loader2 className="animate-spin text-emerald-500" size={32} /> : <Upload className="text-zinc-400" size={32} />}
                          </div>
                          <div className="text-center">
                            <p className="text-lg font-medium text-zinc-200">Click to Upload Image</p>
                            <p className="text-sm text-zinc-500 mt-1">Supports JPG, PNG, WEBP (Max 5MB)</p>
                          </div>
                        </label>
                      </div>
                    )}

                    {imagePickerTab === 'url' && (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-zinc-400 mb-2">Paste Image URL</label>
                          <input 
                            type="url" 
                            value={activeRecipe.imageUrl || ''}
                            onChange={e => setActiveRecipe({...activeRecipe, imageUrl: e.target.value})}
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-emerald-500"
                            placeholder="https://example.com/image.jpg"
                          />
                        </div>
                        {activeRecipe.imageUrl && (
                          <div className="mt-4">
                            <p className="text-xs text-zinc-500 mb-2 uppercase tracking-wider">Preview</p>
                            <div className="aspect-video bg-zinc-950 rounded-xl border border-zinc-800 overflow-hidden">
                              <img 
                                src={activeRecipe.imageUrl} 
                                alt="Preview" 
                                className="w-full h-full object-contain" 
                                referrerPolicy="no-referrer"
                                onError={(e) => (e.target as HTMLImageElement).src = 'https://placehold.co/600x400?text=Invalid+URL'}
                              />
                            </div>
                            <div className="mt-4 flex justify-end">
                              <button 
                                onClick={() => setShowImagePicker(false)}
                                className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors"
                              >
                                Use This Image
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </motion.div>
              </div>
            )}

            {/* EXPORT OPTIONS MODAL */}
            {showExportOptions && (
              <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col md:flex-row"
                >
                  {/* Left: Options */}
                  <div className="flex-1 overflow-y-auto p-6 space-y-8 border-r border-zinc-800">
                    <div className="flex items-center justify-between mb-2">
                      <h2 className="text-2xl font-serif flex items-center gap-2"><Printer className="text-emerald-500" size={24} /> Export Cookbook</h2>
                      <button onClick={() => setShowExportOptions(false)} className="md:hidden text-zinc-500 hover:text-white transition-colors">
                        <X size={20} />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <label className="block text-sm font-medium text-zinc-400 flex items-center gap-2"><Layout size={16} /> Layout Style</label>
                        <div className="grid grid-cols-1 gap-2">
                          <button 
                            onClick={() => setExportOptions({...exportOptions, layout: 'classic'})}
                            className={`p-3 rounded-xl border text-left transition-all ${exportOptions.layout === 'classic' ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400' : 'bg-zinc-950 border-zinc-800 text-zinc-500 hover:border-zinc-700'}`}
                          >
                            <p className="text-sm font-bold">Classic</p>
                            <p className="text-[10px] opacity-70">Standard cookbook layout with clear sections.</p>
                          </button>
                          <button 
                            onClick={() => setExportOptions({...exportOptions, layout: 'compact'})}
                            className={`p-3 rounded-xl border text-left transition-all ${exportOptions.layout === 'compact' ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400' : 'bg-zinc-950 border-zinc-800 text-zinc-500 hover:border-zinc-700'}`}
                          >
                            <p className="text-sm font-bold">Compact</p>
                            <p className="text-[10px] opacity-70">Space-saving layout for printing more on one page.</p>
                          </button>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <label className="block text-sm font-medium text-zinc-400 flex items-center gap-2"><Palette size={16} /> Design Theme</label>
                        <div className="grid grid-cols-1 gap-2">
                          <button 
                            onClick={() => setExportOptions({...exportOptions, design: 'standard'})}
                            className={`p-3 rounded-xl border text-left transition-all ${exportOptions.design === 'standard' ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400' : 'bg-zinc-950 border-zinc-800 text-zinc-500 hover:border-zinc-700'}`}
                          >
                            <p className="text-sm font-bold">Standard</p>
                            <p className="text-[10px] opacity-70">Clean, professional serif typography.</p>
                          </button>
                          <button 
                            onClick={() => setExportOptions({...exportOptions, design: 'modern'})}
                            className={`p-3 rounded-xl border text-left transition-all ${exportOptions.design === 'modern' ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400' : 'bg-zinc-950 border-zinc-800 text-zinc-500 hover:border-zinc-700'}`}
                          >
                            <p className="text-sm font-bold">Modern</p>
                            <p className="text-[10px] opacity-70">Minimalist sans-serif with italic accents.</p>
                          </button>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <label className="block text-sm font-medium text-zinc-400 flex items-center gap-2"><Type size={16} /> Font Size</label>
                        <div className="flex gap-2">
                          {['small', 'medium', 'large'].map(size => (
                            <button 
                              key={size}
                              onClick={() => setExportOptions({...exportOptions, fontSize: size})}
                              className={`flex-1 py-2 rounded-lg border text-xs font-medium capitalize transition-all ${exportOptions.fontSize === size ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400' : 'bg-zinc-950 border-zinc-800 text-zinc-500 hover:border-zinc-700'}`}
                            >
                              {size}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-4">
                        <label className="block text-sm font-medium text-zinc-400 flex items-center gap-2"><Droplets size={16} /> Color Theme</label>
                        <div className="flex gap-2">
                          {[
                            { id: 'monochrome', color: 'bg-zinc-400' },
                            { id: 'emerald', color: 'bg-emerald-500' },
                            { id: 'indigo', color: 'bg-indigo-500' },
                            { id: 'rose', color: 'bg-rose-500' }
                          ].map(theme => (
                            <button 
                              key={theme.id}
                              onClick={() => setExportOptions({...exportOptions, colorTheme: theme.id})}
                              className={`w-8 h-8 rounded-full border-2 transition-all ${exportOptions.colorTheme === theme.id ? 'border-white scale-110' : 'border-transparent opacity-60 hover:opacity-100'} ${theme.color}`}
                              title={theme.id}
                            />
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4 pt-4 border-t border-zinc-800">
                      <label className="block text-sm font-medium text-zinc-400">Content Sections</label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="flex items-center gap-3 p-3 bg-zinc-950 rounded-xl border border-zinc-800">
                          <input 
                            type="checkbox" 
                            id="includeImages"
                            checked={exportOptions.includeImages}
                            onChange={e => setExportOptions({...exportOptions, includeImages: e.target.checked})}
                            className="w-4 h-4 rounded border-zinc-800 bg-zinc-900 text-emerald-500 focus:ring-emerald-500"
                          />
                          <label htmlFor="includeImages" className="text-xs text-zinc-300 cursor-pointer">Include Images</label>
                        </div>
                        <div className="flex items-center gap-3 p-3 bg-zinc-950 rounded-xl border border-zinc-800">
                          <input 
                            type="checkbox" 
                            id="includeTOC"
                            checked={exportOptions.includeTOC}
                            onChange={e => setExportOptions({...exportOptions, includeTOC: e.target.checked})}
                            className="w-4 h-4 rounded border-zinc-800 bg-zinc-900 text-emerald-500 focus:ring-emerald-500"
                          />
                          <label htmlFor="includeTOC" className="text-xs text-zinc-300 cursor-pointer">Table of Contents</label>
                        </div>
                        <div className="flex items-center gap-3 p-3 bg-zinc-950 rounded-xl border border-zinc-800">
                          <input 
                            type="checkbox" 
                            id="includeCover"
                            checked={exportOptions.includeCover}
                            onChange={e => setExportOptions({...exportOptions, includeCover: e.target.checked})}
                            className="w-4 h-4 rounded border-zinc-800 bg-zinc-900 text-emerald-500 focus:ring-emerald-500"
                          />
                          <label htmlFor="includeCover" className="text-xs text-zinc-300 cursor-pointer">Cover Page</label>
                        </div>
                        <div className="flex items-center gap-3 p-3 bg-zinc-950 rounded-xl border border-zinc-800">
                          <select 
                            value={exportOptions.paperSize}
                            onChange={e => setExportOptions({...exportOptions, paperSize: e.target.value})}
                            className="bg-transparent text-xs text-zinc-300 focus:outline-none w-full"
                          >
                            <option value="a4">A4 Paper</option>
                            <option value="letter">Letter Paper</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right: Preview */}
                  <div className="hidden md:flex flex-col w-[380px] bg-zinc-950 p-6 border-l border-zinc-800">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-medium text-zinc-400 flex items-center gap-2"><Eye size={16} /> Live Preview</h3>
                      <button onClick={() => setShowExportOptions(false)} className="text-zinc-500 hover:text-white transition-colors">
                        <X size={20} />
                      </button>
                    </div>
                    
                    <div className="flex-1 bg-white rounded-lg shadow-inner overflow-hidden flex flex-col items-center p-8 relative">
                      {/* Page Mockup */}
                      <div className={`w-full h-full border-2 border-zinc-100 p-6 flex flex-col ${exportOptions.design === 'modern' ? 'font-sans' : 'font-serif'} text-zinc-900`}>
                        {/* Header */}
                        <div className={`text-center mb-6 ${exportOptions.colorTheme === 'emerald' ? 'text-emerald-600' : exportOptions.colorTheme === 'indigo' ? 'text-indigo-600' : exportOptions.colorTheme === 'rose' ? 'text-rose-600' : 'text-zinc-900'}`}>
                          <h4 className={`${exportOptions.fontSize === 'large' ? 'text-xl' : exportOptions.fontSize === 'small' ? 'text-sm' : 'text-lg'} font-bold border-b-2 border-current pb-1 mb-1`}>
                            My Cookbook
                          </h4>
                          <p className="text-[8px] uppercase tracking-widest opacity-60">Selected Recipes Collection</p>
                        </div>

                        {/* Content Mockup */}
                        <div className="space-y-4">
                          <div className="space-y-1">
                            <div className="flex justify-between items-baseline">
                              <span className={`font-bold ${exportOptions.fontSize === 'large' ? 'text-sm' : 'text-xs'}`}>1. Classic Pasta Carbonara</span>
                              <span className="text-[8px] text-zinc-400">Page 3</span>
                            </div>
                            <div className="h-1 w-full bg-zinc-100 rounded-full" />
                          </div>
                          
                          <div className="space-y-1">
                            <div className="flex justify-between items-baseline">
                              <span className={`font-bold ${exportOptions.fontSize === 'large' ? 'text-sm' : 'text-xs'}`}>2. Homemade Pizza Dough</span>
                              <span className="text-[8px] text-zinc-400">Page 5</span>
                            </div>
                            <div className="h-1 w-full bg-zinc-100 rounded-full" />
                          </div>

                          <div className="pt-4 space-y-2">
                             <div className={`h-2 w-1/3 rounded ${exportOptions.colorTheme === 'emerald' ? 'bg-emerald-100' : exportOptions.colorTheme === 'indigo' ? 'bg-indigo-100' : exportOptions.colorTheme === 'rose' ? 'bg-rose-100' : 'bg-zinc-100'}`} />
                             <div className="space-y-1">
                               <div className="h-1 w-full bg-zinc-50 rounded" />
                               <div className="h-1 w-full bg-zinc-50 rounded" />
                               <div className="h-1 w-2/3 bg-zinc-50 rounded" />
                             </div>
                          </div>

                          {exportOptions.includeImages && (
                            <div className="mt-4 aspect-video bg-zinc-100 rounded-md flex items-center justify-center">
                              <ImageIcon className="text-zinc-300" size={24} />
                            </div>
                          )}
                        </div>
                        
                        {/* Footer */}
                        <div className="absolute bottom-4 left-0 right-0 text-center">
                          <span className="text-[8px] text-zinc-300">Page 1 of {selectedRecipes.size + 1}</span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 space-y-3">
                      <button 
                        onClick={handleExportCookbook}
                        disabled={isExporting}
                        className="w-full bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-3 rounded-xl font-medium transition-all shadow-lg shadow-emerald-900/20 flex items-center justify-center gap-2"
                      >
                        {isExporting ? <Loader2 className="animate-spin" size={18} /> : <FileText size={18} />}
                        {isExporting ? 'Generating...' : 'Download Cookbook'}
                      </button>
                      <p className="text-[10px] text-zinc-500 text-center">
                        Generates a high-quality DOCX file with indexed TOC and bookmarks.
                      </p>
                    </div>
                  </div>

                  {/* Mobile Footer */}
                  <div className="md:hidden p-4 bg-zinc-950 border-t border-zinc-800">
                    <button 
                      onClick={handleExportCookbook}
                      disabled={isExporting}
                      className="w-full bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-3 rounded-xl font-medium transition-all flex items-center justify-center gap-2"
                    >
                      {isExporting ? <Loader2 className="animate-spin" size={18} /> : <FileText size={18} />}
                      {isExporting ? 'Generating...' : 'Download Cookbook'}
                    </button>
                  </div>
                </motion.div>
              </div>
            )}

            {/* SIMILAR RECIPES MODAL */}
            {showSimilarModal && (
              <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden shadow-2xl flex flex-col"
                >
                  <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-serif flex items-center gap-2"><Wand2 className="text-emerald-500" size={20} /> AI Similar Recipes</h2>
                      <p className="text-xs text-zinc-500">Broad suggestions based on your collection. Review and import the ones you like.</p>
                    </div>
                    <button onClick={() => setShowSimilarModal(false)} className="text-zinc-500 hover:text-white transition-colors">
                      <X size={20} />
                    </button>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {similarRecipes.map((recipe, idx) => (
                        <div key={idx} className="bg-zinc-950 border border-zinc-800 rounded-xl p-5 flex flex-col h-full">
                          <h3 className="text-lg font-medium text-white mb-2">{recipe.title}</h3>
                          <p className="text-xs text-zinc-400 mb-4 line-clamp-3">{recipe.description}</p>
                          
                          <div className="flex-1 mb-4">
                            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Key Ingredients</p>
                            <div className="flex flex-wrap gap-1">
                              {recipe.ingredients.map((ing: string, i: number) => (
                                <span key={i} className="px-2 py-0.5 bg-zinc-900 text-zinc-400 text-[10px] rounded border border-zinc-800">{ing}</span>
                              ))}
                            </div>
                          </div>

                          <button 
                            onClick={() => {
                              setImportInput(recipe.title + "\n\n" + recipe.description + "\n\nIngredients:\n" + recipe.ingredients.join('\n'));
                              setView('importer');
                              setImportType('text');
                              setShowSimilarModal(false);
                            }}
                            className="w-full bg-emerald-600/10 hover:bg-emerald-600 text-emerald-400 hover:text-white border border-emerald-500/20 py-2 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-2"
                          >
                            <Plus size={14} /> Import to Editor
                          </button>
                        </div>
                      ))}
                    </div>

                    <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-xl">
                      <label className="block text-xs font-medium text-zinc-500 mb-2 uppercase tracking-widest">Refine Search</label>
                      <div className="flex gap-2">
                        <input 
                          type="text" 
                          placeholder="e.g. 'Make them vegan' or 'Focus on dessert variations'"
                          value={searchPrompt}
                          onChange={e => setSearchPrompt(e.target.value)}
                          className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                        />
                        <button 
                          onClick={() => handleSearchSimilar()}
                          disabled={isSearchingSimilar}
                          className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                        >
                          {isSearchingSimilar ? <Loader2 className="animate-spin" size={16} /> : <RefreshCw size={16} />}
                          Regenerate
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>
            )}

          </AnimatePresence>
        </div>
      </main>
    </div>
  </div>
);
}
