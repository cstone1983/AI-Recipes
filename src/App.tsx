import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChefHat, Search, Plus, Settings, Link as LinkIcon, FileText, Image as ImageIcon, Loader2, Clock, Users, BookOpen, Download, Upload, FileJson, Printer, ShieldAlert, LogOut, User as UserIcon, Check, X, Edit2, Trash2, Globe, Sparkles, RefreshCw, Layers, Layout, Palette, Wand2 } from 'lucide-react';

type ImportType = 'url' | 'text' | 'image';
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
  const [activeRecipe, setActiveRecipe] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Cookbook State
  const [recipes, setRecipes] = useState<any[]>([]);
  const [selectedRecipes, setSelectedRecipes] = useState<Set<string>>(new Set());
  const [isExporting, setIsExporting] = useState(false);
  const [viewingRecipe, setViewingRecipe] = useState<any>(null);
  const [recipeViewMode, setRecipeViewMode] = useState<'list' | 'grid'>('grid');
  const [recipeSort, setRecipeSort] = useState<'newest' | 'oldest' | 'alpha'>('newest');
  const [recipeFilter, setRecipeFilter] = useState<string>('all');

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
  const [changingPasswordUserId, setChangingPasswordUserId] = useState<string | null>(null);
  const [adminNewPassword, setAdminNewPassword] = useState('');
  const [updateInfo, setUpdateInfo] = useState<any>(null);
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [isApplyingUpdate, setIsApplyingUpdate] = useState(false);
  const [updateUrl, setUpdateUrl] = useState('');

  // Export Options State
  const [showExportOptions, setShowExportOptions] = useState(false);
  const [exportOptions, setExportOptions] = useState({
    layout: 'classic',
    design: 'standard',
    includeImages: true
  });

  // Similar Search State
  const [isSearchingSimilar, setIsSearchingSimilar] = useState(false);
  const [similarRecipes, setSimilarRecipes] = useState<any[]>([]);
  const [showSimilarModal, setShowSimilarModal] = useState(false);
  const [searchPrompt, setSearchPrompt] = useState('');

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
          setView('importer');
        }
      })
      .catch(() => {});
  }, [token]);

  useEffect(() => {
    if (view === 'cookbook' && user) {
      fetchRecipes();
    } else if (view === 'admin' && user?.role === 'Admin') {
      fetchUsers();
      fetchConfig();
    }
  }, [view, user]);

  const fetchRecipes = async () => {
    try {
      const res = await fetch('/api/recipes', { headers: getHeaders() });
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
    try {
      const res = await fetch('/api/admin/update/apply', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ version: updateInfo.latestVersion })
      });
      const data = await res.json();
      if (data.success) {
        alert(data.message);
      }
    } catch (e) {
      alert('Failed to apply update');
    } finally {
      setIsApplyingUpdate(false);
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
          setView('importer');
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

  const handleImport = async () => {
    if (!importInput && importType !== 'image') return;
    setIsImporting(true);
    console.log('Starting import...', { type: importType, useWebSearch });
    try {
      const res = await fetch('/api/recipes/parse', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ input: importInput, type: importType, useWebSearch })
      });
      
      console.log('Response status:', res.status);
      const contentType = res.headers.get('content-type');
      
      if (contentType && contentType.includes('application/json')) {
        const data = await res.json();
        console.log('Response data:', data);
        if (data.success) {
          setActiveRecipe(data.data);
          setImportInput('');
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
    }
  };

  const handleSaveRecipe = async () => {
    if (!activeRecipe) return;
    setIsSaving(true);
    try {
      const res = await fetch('/api/recipes', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(activeRecipe)
      });
      const data = await res.json();
      if (data.success) {
        setActiveRecipe(null);
        alert('Recipe saved successfully!');
      } else {
        alert('Failed to save recipe: ' + data.error);
      }
    } catch (err) {
      alert('Network error while saving.');
    } finally {
      setIsSaving(false);
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
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-emerald-500/30 flex">
      {/* Sidebar */}
      <aside className="w-64 border-r border-zinc-900 bg-zinc-950 flex flex-col h-screen sticky top-0">
        <div className="p-6 flex items-center gap-3 border-b border-zinc-900">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500">
            <ChefHat size={20} />
          </div>
          <span className="font-serif text-lg font-medium tracking-wide">CulinaryBase</span>
        </div>
        
        <nav className="flex-1 p-4 space-y-1">
          <button 
            onClick={() => setView('importer')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${view === 'importer' ? 'bg-zinc-900 text-emerald-400' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50'}`}
          >
            <Plus size={18} /> Import Recipe
          </button>
          <button 
            onClick={() => setView('cookbook')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${view === 'cookbook' ? 'bg-zinc-900 text-emerald-400' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50'}`}
          >
            <BookOpen size={18} /> My Cookbook
          </button>
          {user.role === 'Admin' && (
            <button 
              onClick={() => setView('admin')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${view === 'admin' ? 'bg-zinc-900 text-emerald-400' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50'}`}
            >
              <ShieldAlert size={18} /> Admin Panel
            </button>
          )}
          <button 
            onClick={() => setView('settings')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${view === 'settings' ? 'bg-zinc-900 text-emerald-400' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50'}`}
          >
            <Settings size={18} /> Settings
          </button>
        </nav>

        <div className="p-4 border-t border-zinc-900">
          <div className="flex items-center justify-between px-3 py-2 text-sm text-zinc-400">
            <div className="flex items-center gap-2">
              <UserIcon size={16} />
              <span className="truncate max-w-[120px]">{user.username}</span>
            </div>
            <button onClick={handleLogout} className="hover:text-red-400 transition-colors" title="Logout">
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="max-w-5xl mx-auto p-8">
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
                <div>
                  <h1 className="text-3xl font-serif tracking-tight mb-2">Universal Importer</h1>
                  <p className="text-zinc-400 text-sm">Extract recipes from any source using AI.</p>
                  {!isAiConfigured && (
                    <div className="mt-4 p-4 bg-amber-900/20 border border-amber-900/50 rounded-xl flex items-start gap-3">
                      <ShieldAlert className="text-amber-500 shrink-0" size={20} />
                      <div>
                        <p className="text-sm font-medium text-amber-200">AI Not Configured</p>
                        <p className="text-xs text-amber-400 mt-1">Please go to the Admin Panel and provide a Gemini API Key to enable recipe extraction.</p>
                      </div>
                    </div>
                  )}
                </div>

                {!activeRecipe ? (
                  <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
                    <div className="flex gap-2 mb-6">
                      {(['url', 'text', 'image'] as ImportType[]).map(type => (
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
                    </div>
                  </div>
                ) : (
                  <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
                    <div className="p-6 border-b border-zinc-800 flex justify-between items-center bg-zinc-950/50">
                      <h2 className="text-xl font-serif">Review Recipe</h2>
                      <div className="flex gap-3">
                        <button 
                          onClick={() => setActiveRecipe(null)}
                          className="px-4 py-2 rounded-lg text-sm font-medium text-zinc-400 hover:text-zinc-200 transition-colors"
                        >
                          Discard
                        </button>
                        <button 
                          onClick={handleSaveRecipe}
                          disabled={isSaving}
                          className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                        >
                          {isSaving ? <Loader2 className="animate-spin" size={16} /> : <Check size={16} />}
                          Save Recipe
                        </button>
                      </div>
                    </div>
                    
                    <div className="p-6 space-y-6">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2 md:col-span-1">
                          <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Title</label>
                          <input 
                            type="text" 
                            value={activeRecipe.title || ''}
                            onChange={e => setActiveRecipe({...activeRecipe, title: e.target.value})}
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-lg font-serif focus:outline-none focus:border-emerald-500"
                          />
                        </div>
                        <div className="col-span-2 md:col-span-1">
                          <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Category</label>
                          <input 
                            type="text" 
                            placeholder="e.g. Dessert, Main Course, Breakfast"
                            value={activeRecipe.category || ''}
                            onChange={e => setActiveRecipe({...activeRecipe, category: e.target.value})}
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-lg font-serif focus:outline-none focus:border-emerald-500"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-4">
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

                      <div className="grid grid-cols-2 gap-8">
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
                              </div>
                            ))}
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
                  <div>
                    <h1 className="text-3xl font-serif tracking-tight mb-2">My Cookbook</h1>
                    <p className="text-zinc-400 text-sm">Select recipes to export as a formatted document.</p>
                  </div>
                  <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
                    <select 
                      value={recipeFilter}
                      onChange={(e) => setRecipeFilter(e.target.value)}
                      className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
                    >
                      <option value="all">All Categories</option>
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
                  {recipes
                    .filter(r => recipeFilter === 'all' || r.category === recipeFilter)
                    .sort((a, b) => {
                      if (recipeSort === 'newest') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
                      if (recipeSort === 'oldest') return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
                      if (recipeSort === 'alpha') return a.title.localeCompare(b.title);
                      return 0;
                    })
                    .map(recipe => (
                    <div 
                      key={recipe.id}
                      className={`p-4 rounded-xl border transition-all flex ${recipeViewMode === 'grid' ? 'flex-col' : 'flex-row items-center justify-between'} ${selectedRecipes.has(recipe.id) ? 'bg-emerald-900/20 border-emerald-500/50' : 'bg-zinc-900/50 border-zinc-800 hover:border-zinc-700'}`}
                    >
                      <div className={`flex-1 ${recipeViewMode === 'grid' ? 'mb-4' : ''}`}>
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-serif text-lg leading-tight mb-1">{recipe.title}</h3>
                          {recipe.category && <span className="text-[10px] uppercase tracking-wider bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full whitespace-nowrap">{recipe.category}</span>}
                        </div>
                        <div className="flex items-center gap-4 text-xs text-zinc-500 mt-2">
                          <span className="flex items-center gap-1"><Clock size={12} /> {(recipe.prepTime || 0) + (recipe.cookTime || 0)}m</span>
                          <span className="flex items-center gap-1"><Users size={12} /> {recipe.yield || 'N/A'}</span>
                        </div>
                      </div>
                      
                      <div className={`flex items-center gap-3 ${recipeViewMode === 'grid' ? 'w-full justify-between mt-auto pt-4 border-t border-zinc-800/50' : ''}`}>
                        <button 
                          onClick={(e) => { e.stopPropagation(); setViewingRecipe(recipe); }}
                          className="text-sm text-zinc-400 hover:text-emerald-400 transition-colors flex items-center gap-1"
                        >
                          <FileText size={14} /> View
                        </button>
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
                    {viewingRecipe.description && <p className="text-zinc-300 italic">{viewingRecipe.description}</p>}
                    
                    <div className="flex flex-wrap gap-4 text-sm text-zinc-400 bg-zinc-950/50 p-4 rounded-xl border border-zinc-800/50">
                      {viewingRecipe.prepTime && <div><span className="text-zinc-500 uppercase text-xs tracking-wider block mb-1">Prep Time</span>{viewingRecipe.prepTime} mins</div>}
                      {viewingRecipe.cookTime && <div><span className="text-zinc-500 uppercase text-xs tracking-wider block mb-1">Cook Time</span>{viewingRecipe.cookTime} mins</div>}
                      {viewingRecipe.yield && <div><span className="text-zinc-500 uppercase text-xs tracking-wider block mb-1">Yield</span>{viewingRecipe.yield}</div>}
                      {viewingRecipe.category && <div><span className="text-zinc-500 uppercase text-xs tracking-wider block mb-1">Category</span>{viewingRecipe.category}</div>}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                      <div className="md:col-span-1 space-y-4">
                        <h3 className="text-lg font-serif border-b border-zinc-800 pb-2">Ingredients</h3>
                        <ul className="space-y-2">
                          {viewingRecipe.ingredients?.map((ing: any, i: number) => (
                            <li key={i} className="text-sm text-zinc-300 flex items-start gap-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0" />
                              <span>
                                {ing.amount && <span className="font-medium text-white mr-1">{ing.amount}</span>}
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
                        <div className="text-sm text-zinc-300 whitespace-pre-wrap leading-relaxed">
                          {viewingRecipe.instructions}
                        </div>
                      </div>
                    </div>
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
                                <span className={`px-2 py-1 rounded text-xs font-medium ${u.role === 'Admin' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-zinc-800 text-zinc-300'}`}>
                                  {u.role}
                                </span>
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

                <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-medium flex items-center gap-2"><RefreshCw className={isCheckingUpdate ? 'animate-spin text-emerald-500' : 'text-emerald-500'} size={18} /> System Update</h2>
                    <button 
                      onClick={checkUpdate}
                      disabled={isCheckingUpdate}
                      className="text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      Check for Updates
                    </button>
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
                          <button 
                            onClick={applyUpdate}
                            disabled={isApplyingUpdate}
                            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                          >
                            {isApplyingUpdate ? <Loader2 className="animate-spin" size={16} /> : <Download size={16} />}
                            {isApplyingUpdate ? 'Applying Update...' : 'Apply Update Now'}
                          </button>
                          <p className="text-[10px] text-zinc-500 mt-2 text-center italic">Updating will maintain all your recipes, users, and settings.</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8 border-2 border-dashed border-zinc-800 rounded-xl">
                      <p className="text-sm text-zinc-500">Click "Check for Updates" to see if a new version is available.</p>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-6">
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
                    <button className="inline-flex items-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
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

            {/* EXPORT OPTIONS MODAL */}
            {showExportOptions && (
              <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl"
                >
                  <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
                    <h2 className="text-xl font-serif flex items-center gap-2"><Printer className="text-emerald-500" size={20} /> Export Cookbook</h2>
                    <button onClick={() => setShowExportOptions(false)} className="text-zinc-500 hover:text-white transition-colors">
                      <X size={20} />
                    </button>
                  </div>
                  <div className="p-6 space-y-6">
                    <div className="space-y-4">
                      <label className="block text-sm font-medium text-zinc-400 flex items-center gap-2"><Layout size={16} /> Layout Style</label>
                      <div className="grid grid-cols-2 gap-3">
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
                      <div className="grid grid-cols-2 gap-3">
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

                    <div className="flex items-center gap-3 p-4 bg-zinc-950 rounded-xl border border-zinc-800">
                      <input 
                        type="checkbox" 
                        id="includeImages"
                        checked={exportOptions.includeImages}
                        onChange={e => setExportOptions({...exportOptions, includeImages: e.target.checked})}
                        className="w-4 h-4 rounded border-zinc-800 bg-zinc-900 text-emerald-500 focus:ring-emerald-500"
                      />
                      <label htmlFor="includeImages" className="text-sm text-zinc-300 cursor-pointer">Include recipe images in export</label>
                    </div>
                  </div>
                  <div className="p-6 bg-zinc-950/50 border-t border-zinc-800 flex gap-3">
                    <button 
                      onClick={() => setShowExportOptions(false)}
                      className="flex-1 px-4 py-2 rounded-lg text-sm font-medium text-zinc-400 hover:bg-zinc-800 transition-colors"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={handleExportCookbook}
                      disabled={isExporting}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                    >
                      {isExporting ? <Loader2 className="animate-spin" size={16} /> : <FileText size={16} />}
                      {isExporting ? 'Generating...' : 'Download DOCX'}
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
  );
}
