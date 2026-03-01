/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { motion } from 'motion/react';
import { ChefHat, Search, Plus, Settings, Link as LinkIcon, FileText, Image as ImageIcon, Loader2, Clock, Users, BookOpen, Download, Upload, FileJson, Printer, ShieldAlert } from 'lucide-react';

type ImportType = 'url' | 'text' | 'image';
type ViewState = 'importer' | 'settings' | 'cookbook';

export default function App() {
  const [view, setView] = useState<ViewState>('importer');
  const [importType, setImportType] = useState<ImportType>('url');
  const [importInput, setImportInput] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [activeRecipe, setActiveRecipe] = useState<any>(null);
  const [recipes, setRecipes] = useState<any[]>([]);

  React.useEffect(() => {
    if (view === 'cookbook') {
      fetch('/api/user/export')
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) {
            setRecipes(data);
          }
        })
        .catch(console.error);
    }
  }, [view]);

  // Cookbook Settings
  const [cbIncludeImages, setCbIncludeImages] = useState(true);
  const [cbCompactLayout, setCbCompactLayout] = useState(false);
  const [cbLargeFont, setCbLargeFont] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);

  const handleImport = async () => {
    if (!importInput) return;
    setIsImporting(true);
    try {
      const res = await fetch('/api/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: importInput, type: importType })
      });
      const data = await res.json();
      if (data.success) {
        setActiveRecipe(data.data);
        setImportInput('');
      } else {
        alert('Failed to import recipe: ' + (data.error || 'Unknown error'));
      }
    } catch (err) {
      console.error(err);
      alert('Network error during import.');
    } finally {
      setIsImporting(false);
    }
  };

  const handleAdminBackup = () => {
    window.location.href = '/api/admin/backup';
  };

  const handleUserExport = () => {
    window.location.href = '/api/user/export';
  };

  const handlePrintCookbook = () => {
    setIsPrinting(true);
    setTimeout(() => {
      window.print();
      setIsPrinting(false);
    }, 500);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-emerald-500/30">
      {/* Print View (Only visible during print) */}
      {isPrinting && (
        <div className="fixed inset-0 bg-white text-black z-[9999] overflow-auto print:block">
          <div className="max-w-4xl mx-auto p-8">
            <h1 className="text-5xl font-serif text-center mb-16 mt-32">My Cookbook</h1>
            
            {/* Table of Contents */}
            <div className="mb-16 page-break-after">
              <h2 className="text-3xl font-serif mb-6 border-b pb-2">Table of Contents</h2>
              <ul className="space-y-2 text-lg">
                {recipes.length > 0 ? (
                  recipes.map((recipe, idx) => (
                    <li key={recipe.id} className="flex justify-between">
                      <span>{recipe.title}</span>
                      <span className="text-gray-500">{idx + 1}</span>
                    </li>
                  ))
                ) : (
                  <li>No recipes found.</li>
                )}
              </ul>
            </div>

            {/* Recipes */}
            {recipes.map((recipe, idx) => (
              <div key={recipe.id} className={`recipe-page ${cbCompactLayout ? 'mb-16' : 'page-break-before'} ${cbLargeFont ? 'text-xl' : 'text-base'}`}>
                <h2 className="text-4xl font-serif mb-4">{recipe.title}</h2>
                {recipe.description && <p className="italic text-gray-700 mb-6">{recipe.description}</p>}
                
                <div className="flex gap-6 mb-8 text-sm text-gray-600 border-y py-3">
                  {recipe.prepTime && <span>Prep: {recipe.prepTime}m</span>}
                  {recipe.cookTime && <span>Cook: {recipe.cookTime}m</span>}
                  {recipe.yield && <span>Yield: {recipe.yield}</span>}
                </div>

                <div className={`grid ${cbCompactLayout ? 'grid-cols-1 gap-8' : 'grid-cols-3 gap-12'}`}>
                  <div className={cbCompactLayout ? '' : 'col-span-1'}>
                    <h3 className="font-bold uppercase tracking-wider mb-4 border-b pb-2">Ingredients</h3>
                    <ul className="space-y-2">
                      {recipe.ingredients?.map((ing: any, i: number) => (
                        <li key={i}>
                          <strong>{ing.amount} {ing.unit}</strong> {ing.name}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className={cbCompactLayout ? '' : 'col-span-2'}>
                    <h3 className="font-bold uppercase tracking-wider mb-4 border-b pb-2">Instructions</h3>
                    <ol className="list-decimal list-inside space-y-4">
                      {recipe.instructions?.map((step: string, i: number) => (
                        <li key={i} className="pl-2">{step}</li>
                      ))}
                    </ol>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sidebar / Navigation */}
      <nav className="fixed left-0 top-0 bottom-0 w-64 border-r border-zinc-800/50 bg-zinc-950/50 backdrop-blur-xl z-50 flex flex-col print:hidden">
        <div className="p-6 flex items-center gap-3 cursor-pointer" onClick={() => setView('importer')}>
          <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center text-zinc-950">
            <ChefHat size={20} strokeWidth={2.5} />
          </div>
          <span className="font-semibold tracking-tight text-lg">CulinaryBase</span>
        </div>

        <div className="px-4 pb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
            <input 
              type="text" 
              placeholder="Search recipes..." 
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all placeholder:text-zinc-600"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-2 space-y-1">
          <div className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-3 px-2">Your Library</div>
          {['All Recipes', 'Favorites', 'Breakfast', 'Dinner', 'Desserts'].map((item, i) => (
            <button key={i} className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${i === 0 ? 'bg-zinc-800/50 text-zinc-100' : 'text-zinc-400 hover:bg-zinc-800/30 hover:text-zinc-200'}`}>
              {item}
            </button>
          ))}
        </div>

        <div className="p-4 border-t border-zinc-800/50 space-y-2">
          <button 
            onClick={() => setView('cookbook')}
            className={`flex items-center gap-3 text-sm transition-colors px-3 py-2 w-full rounded-lg ${view === 'cookbook' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/30'}`}
          >
            <BookOpen size={16} />
            Cookbook Generator
          </button>
          <button 
            onClick={() => setView('settings')}
            className={`flex items-center gap-3 text-sm transition-colors px-3 py-2 w-full rounded-lg ${view === 'settings' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/30'}`}
          >
            <Settings size={16} />
            Settings
          </button>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="pl-64 min-h-screen flex flex-col print:hidden">
        {view === 'importer' && (
          <>
            <header className="sticky top-0 z-40 bg-zinc-950/80 backdrop-blur-xl border-b border-zinc-800/50 p-6">
              <div className="max-w-4xl mx-auto">
                <h1 className="text-2xl font-medium tracking-tight mb-6">Universal Importer</h1>
                
                <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl p-1 flex items-center gap-1 mb-4 w-fit">
                  {[
                    { id: 'url', icon: LinkIcon, label: 'URL' },
                    { id: 'text', icon: FileText, label: 'Raw Text' },
                    { id: 'image', icon: ImageIcon, label: 'Image' }
                  ].map((type) => (
                    <button
                      key={type.id}
                      onClick={() => setImportType(type.id as ImportType)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${importType === type.id ? 'bg-zinc-800 text-zinc-100 shadow-sm' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/30'}`}
                    >
                      <type.icon size={16} />
                      {type.label}
                    </button>
                  ))}
                </div>

                <div className="flex gap-3">
                  <div className="relative flex-1">
                    {importType === 'url' && (
                      <input 
                        type="url" 
                        value={importInput}
                        onChange={(e) => setImportInput(e.target.value)}
                        placeholder="Paste recipe URL here..." 
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all placeholder:text-zinc-600"
                      />
                    )}
                    {importType === 'text' && (
                      <textarea 
                        value={importInput}
                        onChange={(e) => setImportInput(e.target.value)}
                        placeholder="Paste raw recipe text here..." 
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all placeholder:text-zinc-600 min-h-[100px] resize-y"
                      />
                    )}
                    {importType === 'image' && (
                      <div className="w-full bg-zinc-900 border border-zinc-800 border-dashed rounded-xl px-4 py-8 text-center flex flex-col items-center justify-center gap-2 text-zinc-500 hover:bg-zinc-800/30 transition-colors cursor-pointer">
                        <ImageIcon size={24} className="text-zinc-600" />
                        <span className="text-sm">Click to upload or drag and drop an image</span>
                        <span className="text-xs text-zinc-600">Supports JPG, PNG, WEBP</span>
                      </div>
                    )}
                  </div>
                  <button 
                    onClick={handleImport}
                    disabled={isImporting || !importInput && importType !== 'image'}
                    className="bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-medium px-6 py-3 rounded-xl transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed h-fit"
                  >
                    {isImporting ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
                    Import
                  </button>
                </div>
              </div>
            </header>

            <div className="flex-1 p-6 overflow-y-auto">
              <div className="max-w-4xl mx-auto">
                {activeRecipe ? (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-zinc-900/30 border border-zinc-800/50 rounded-2xl overflow-hidden"
                  >
                    <div className="p-8 border-b border-zinc-800/50">
                      <div className="flex items-center gap-2 text-emerald-500 text-sm font-medium mb-4">
                        <BookOpen size={16} />
                        <span>Imported Recipe</span>
                        <button 
                          onClick={async () => {
                            try {
                              const formData = new FormData();
                              formData.append('mode', 'merge');
                              
                              // We need to create a JSON file to send to the import endpoint
                              const blob = new Blob([JSON.stringify([activeRecipe])], { type: 'application/json' });
                              formData.append('file', blob, 'import.json');

                              const res = await fetch('/api/user/import', {
                                method: 'POST',
                                body: formData
                              });
                              const data = await res.json();
                              if (data.success) {
                                alert('Recipe saved to library!');
                                setActiveRecipe(null);
                              } else {
                                alert('Failed to save: ' + data.error);
                              }
                            } catch (err) {
                              alert('Network error while saving.');
                            }
                          }}
                          className="ml-auto bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-2"
                        >
                          <Plus size={14} />
                          Save to Library
                        </button>
                      </div>
                      <h2 className="text-4xl font-semibold tracking-tight mb-4">{activeRecipe.title}</h2>
                      {activeRecipe.description && (
                        <p className="text-zinc-400 text-lg leading-relaxed mb-6">{activeRecipe.description}</p>
                      )}
                      
                      <div className="flex flex-wrap gap-6 text-sm text-zinc-400">
                        {activeRecipe.prepTime && (
                          <div className="flex items-center gap-2">
                            <Clock size={16} className="text-zinc-500" />
                            <span>Prep: {activeRecipe.prepTime}m</span>
                          </div>
                        )}
                        {activeRecipe.cookTime && (
                          <div className="flex items-center gap-2">
                            <Clock size={16} className="text-zinc-500" />
                            <span>Cook: {activeRecipe.cookTime}m</span>
                          </div>
                        )}
                        {activeRecipe.yield && (
                          <div className="flex items-center gap-2">
                            <Users size={16} className="text-zinc-500" />
                            <span>Yields: {activeRecipe.yield}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="grid md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-zinc-800/50">
                      <div className="p-8 md:col-span-1 bg-zinc-900/20">
                        <h3 className="text-sm font-medium text-zinc-100 uppercase tracking-wider mb-6">Ingredients</h3>
                        <ul className="space-y-4">
                          {activeRecipe.ingredients?.map((ing: any, i: number) => (
                            <li key={i} className="flex items-baseline gap-3 text-sm">
                              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/50 shrink-0 mt-1.5" />
                              <div>
                                <span className="font-medium text-zinc-200">
                                  {ing.amount} {ing.unit}
                                </span>
                                {' '}
                                <span className="text-zinc-400">{ing.name}</span>
                                {ing.notes && <span className="text-zinc-500 italic block mt-0.5">{ing.notes}</span>}
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                      
                      <div className="p-8 md:col-span-2">
                        <h3 className="text-sm font-medium text-zinc-100 uppercase tracking-wider mb-6">Instructions</h3>
                        <div className="space-y-6">
                          {activeRecipe.instructions?.map((step: string, i: number) => (
                            <div key={i} className="flex gap-4">
                              <div className="flex-shrink-0 w-8 h-8 rounded-full border border-zinc-800 flex items-center justify-center text-sm font-medium text-zinc-500">
                                {i + 1}
                              </div>
                              <p className="text-zinc-300 leading-relaxed pt-1">{step}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <div className="h-[40vh] flex flex-col items-center justify-center text-zinc-500">
                    <ChefHat size={48} className="mb-4 opacity-20" />
                    <p>Import a recipe to see it here.</p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {view === 'settings' && (
          <div className="p-8 max-w-4xl mx-auto w-full">
            <h1 className="text-3xl font-medium tracking-tight mb-8">Settings & Data</h1>

            <div className="space-y-8">
              {/* User Export/Import */}
              <section className="bg-zinc-900/30 border border-zinc-800/50 rounded-2xl p-6">
                <h2 className="text-xl font-medium mb-2 flex items-center gap-2">
                  <FileJson className="text-emerald-500" size={20} />
                  My Data
                </h2>
                <p className="text-zinc-400 text-sm mb-6">Backup or restore your personal recipe collection as a JSON file.</p>
                
                <div className="flex gap-4">
                  <button onClick={handleUserExport} className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                    <Download size={16} />
                    Export My Recipes
                  </button>
                  <label className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer">
                    <Upload size={16} />
                    Import Recipes
                    <input type="file" className="hidden" accept=".json" onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      
                      const formData = new FormData();
                      formData.append('file', file);
                      formData.append('mode', 'merge'); // or overwrite, could be a toggle

                      try {
                        const res = await fetch('/api/user/import', {
                          method: 'POST',
                          body: formData
                        });
                        const data = await res.json();
                        if (data.success) {
                          alert(data.message);
                        } else {
                          alert('Import failed: ' + data.error);
                        }
                      } catch (err) {
                        alert('Network error during import.');
                      }
                    }} />
                  </label>
                </div>
              </section>

              {/* Admin Backup/Restore */}
              <section className="bg-red-950/10 border border-red-900/30 rounded-2xl p-6">
                <h2 className="text-xl font-medium mb-2 flex items-center gap-2 text-red-400">
                  <ShieldAlert size={20} />
                  System Administration
                </h2>
                <p className="text-zinc-400 text-sm mb-6">Full system backup and restore. This affects all users and requires Admin privileges.</p>
                
                <div className="flex gap-4">
                  <button onClick={handleAdminBackup} className="flex items-center gap-2 bg-red-900/50 hover:bg-red-900/80 text-red-200 px-4 py-2 rounded-lg text-sm font-medium transition-colors border border-red-800/50">
                    <Download size={16} />
                    Download System Backup
                  </button>
                  <label className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer">
                    <Upload size={16} />
                    Restore System
                    <input type="file" className="hidden" accept=".zip,.tar.gz" onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;

                      if (!confirm('WARNING: This will overwrite the current database and images. The system will restart. Proceed?')) {
                        return;
                      }
                      
                      const formData = new FormData();
                      formData.append('backup', file);

                      try {
                        const res = await fetch('/api/admin/restore', {
                          method: 'POST',
                          body: formData
                        });
                        const data = await res.json();
                        if (data.success) {
                          alert(data.message);
                        } else {
                          alert('Restore failed: ' + data.error);
                        }
                      } catch (err) {
                        alert('Network error during restore.');
                      }
                    }} />
                  </label>
                </div>
              </section>
            </div>
          </div>
        )}

        {view === 'cookbook' && (
          <div className="p-8 max-w-4xl mx-auto w-full">
            <h1 className="text-3xl font-medium tracking-tight mb-8">Cookbook Generator</h1>
            
            <div className="grid md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-2xl p-6">
                  <h3 className="text-lg font-medium mb-4">Styling Options</h3>
                  
                  <div className="space-y-4">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={cbIncludeImages} 
                        onChange={(e) => setCbIncludeImages(e.target.checked)}
                        className="w-4 h-4 rounded border-zinc-700 bg-zinc-900 text-emerald-500 focus:ring-emerald-500/50"
                      />
                      <span className="text-sm text-zinc-300">Include Images</span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={cbCompactLayout} 
                        onChange={(e) => setCbCompactLayout(e.target.checked)}
                        className="w-4 h-4 rounded border-zinc-700 bg-zinc-900 text-emerald-500 focus:ring-emerald-500/50"
                      />
                      <span className="text-sm text-zinc-300">Compact Layout (Multiple recipes per page)</span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={cbLargeFont} 
                        onChange={(e) => setCbLargeFont(e.target.checked)}
                        className="w-4 h-4 rounded border-zinc-700 bg-zinc-900 text-emerald-500 focus:ring-emerald-500/50"
                      />
                      <span className="text-sm text-zinc-300">Large Font (Kitchen Reading)</span>
                    </label>
                  </div>
                </div>

                <button 
                  onClick={handlePrintCookbook}
                  className="w-full bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-medium px-6 py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  <Printer size={18} />
                  Generate PDF Cookbook
                </button>
              </div>

              <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-2xl p-6 flex flex-col items-center justify-center text-center min-h-[300px]">
                <BookOpen size={48} className="text-zinc-700 mb-4" />
                <h3 className="text-lg font-medium text-zinc-300 mb-2">Preview</h3>
                <p className="text-sm text-zinc-500 max-w-xs">
                  Your cookbook will be generated using your browser's native print-to-PDF functionality, ensuring perfect formatting.
                </p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
