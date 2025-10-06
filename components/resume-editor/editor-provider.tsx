"use client"

import { createContext, useContext, useState, useCallback, ReactNode, useEffect, useRef } from 'react'
import type { EditorState, ContactField, EditorSummary, EditorSkill, EditorInterest, EditorExperience, EditorBullet, EditorEducation, EditorCertification } from '@/lib/resume-editor-utils'
import { generatePlainText, countIncludedFields, generateId, convertEditorStateToDatabase } from '@/lib/resume-editor-utils'
import { useUndoRedo } from '@/hooks/use-undo-redo'

interface EditorContextType {
  state: EditorState
  resumeId: string
  
  // Undo/Redo operations
  undo: () => void
  redo: () => void
  canUndo: boolean
  canRedo: boolean
  
  // Contact operations
  updateContact: (field: keyof EditorState['contact'], key: 'value' | 'include', value: any) => void
  
  // Target title operations
  updateTargetTitle: (key: 'value' | 'include', value: any) => void
  
  // Summary operations
  updateSummary: (id: string, key: keyof EditorSummary, value: any) => void
  addSummary: () => string
  removeSummary: (id: string) => void
  
  // Skills operations
  updateSkill: (id: string, key: keyof EditorSkill, value: any) => void
  addSkill: (value: string) => void
  removeSkill: (id: string) => void
  
  // Interests operations
  updateInterest: (id: string, key: keyof EditorInterest, value: any) => void
  addInterest: (value: string) => void
  removeInterest: (id: string) => void
  
  // Experience operations
  updateExperience: (id: string, updates: Partial<EditorExperience>) => void
  addExperience: () => void
  removeExperience: (id: string) => void
  updateBullet: (expId: string, bulletId: string, key: keyof EditorBullet, value: any) => void
  addBullet: (expId: string) => void
  removeBullet: (expId: string, bulletId: string) => void
  
  // Education operations
  updateEducation: (id: string, updates: Partial<EditorEducation>) => void
  addEducation: () => void
  removeEducation: (id: string) => void
  
  // Certification operations
  updateCertification: (id: string, updates: Partial<EditorCertification>) => void
  addCertification: () => void
  removeCertification: (id: string) => void
  
  // General operations
  getIncludedCount: () => number
  save: () => Promise<void>
  isSaving: boolean
  isDirty: boolean
  lastSaved: Date | null
}

const EditorContext = createContext<EditorContextType | null>(null)

export function useEditor() {
  const context = useContext(EditorContext)
  if (!context) {
    throw new Error('useEditor must be used within EditorProvider')
  }
  return context
}

interface EditorProviderProps {
  children: ReactNode
  initialState: EditorState
  resumeId: string
}

export function EditorProvider({ children, initialState, resumeId }: EditorProviderProps) {
  // Use undo/redo hook for state management
  const { 
    state, 
    setState: setStateWithHistory, 
    undo: undoState, 
    redo: redoState, 
    canUndo, 
    canRedo 
  } = useUndoRedo<EditorState>(initialState, { maxHistory: 50 })
  
  const [isSaving, setIsSaving] = useState(false)
  const [isDirty, setIsDirty] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  
  // Track if we just saved to prevent immediate dirty marking
  const justSavedRef = useRef(false)
  
  // Wrapper to update state with history and mark as dirty
  const setState = useCallback((updater: (prev: EditorState) => EditorState) => {
    setStateWithHistory(updater)
    // Don't mark dirty if we just saved
    if (!justSavedRef.current) {
      setIsDirty(true)
    }
  }, [setStateWithHistory])
  
  // Wrap undo/redo to mark as dirty
  const undo = useCallback(() => {
    undoState()
    justSavedRef.current = false
    setIsDirty(true)
  }, [undoState])
  
  const redo = useCallback(() => {
    redoState()
    justSavedRef.current = false
    setIsDirty(true)
  }, [redoState])

  // Update contact field
  const updateContact = useCallback((
    field: keyof EditorState['contact'],
    key: 'value' | 'include',
    value: any
  ) => {
    setState(prev => ({
      ...prev,
      contact: {
        ...prev.contact,
        [field]: {
          ...prev.contact[field],
          [key]: value
        }
      }
    }))
  }, [setState])

  // Update target title
  const updateTargetTitle = useCallback((key: 'value' | 'include', value: any) => {
    setState(prev => ({
      ...prev,
      targetTitle: {
        ...prev.targetTitle,
        [key]: value
      }
    }))
  }, [setState])

  // Update summary
  const updateSummary = useCallback((id: string, key: keyof EditorSummary, value: any) => {
    setState(prev => ({
      ...prev,
      summaries: prev.summaries.map(summary =>
        summary.id === id ? { ...summary, [key]: value } : summary
      )
    }))
  }, [setState])

  // Add new summary
  const addSummary = useCallback(() => {
    const newId = generateId('summary')
    setState(prev => ({
      ...prev,
      summaries: [
        ...prev.summaries,
        {
          id: newId,
          value: '',
          include: false
        }
      ]
    }))
    return newId
  }, [setState])

  // Remove summary
  const removeSummary = useCallback((id: string) => {
    setState(prev => ({
      ...prev,
      summaries: prev.summaries.filter(summary => summary.id !== id)
    }))
  }, [setState])

  // Update skill
  const updateSkill = useCallback((id: string, key: keyof EditorSkill, value: any) => {
    setState(prev => ({
      ...prev,
      skills: prev.skills.map(skill =>
        skill.id === id ? { ...skill, [key]: value } : skill
      )
    }))
  }, [setState])

  // Add skill
  const addSkill = useCallback((value: string) => {
    if (!value.trim()) return
    
    setState(prev => ({
      ...prev,
      skills: [
        ...prev.skills,
        {
          id: generateId('skill'),
          value: value.trim(),
          include: true
        }
      ]
    }))
  }, [setState])

  // Remove skill
  const removeSkill = useCallback((id: string) => {
    setState(prev => ({
      ...prev,
      skills: prev.skills.filter(skill => skill.id !== id)
    }))
  }, [setState])

  // Update interest
  const updateInterest = useCallback((id: string, key: keyof EditorInterest, value: any) => {
    setState(prev => ({
      ...prev,
      interests: prev.interests.map(interest =>
        interest.id === id ? { ...interest, [key]: value } : interest
      )
    }))
  }, [setState])

  // Add interest
  const addInterest = useCallback((value: string) => {
    if (!value.trim()) return
    
    setState(prev => ({
      ...prev,
      interests: [
        ...prev.interests,
        {
          id: generateId('interest'),
          value: value.trim(),
          include: true
        }
      ]
    }))
  }, [setState])

  // Remove interest
  const removeInterest = useCallback((id: string) => {
    setState(prev => ({
      ...prev,
      interests: prev.interests.filter(interest => interest.id !== id)
    }))
  }, [setState])

  // Update experience
  const updateExperience = useCallback((id: string, updates: Partial<EditorExperience>) => {
    setState(prev => ({
      ...prev,
      experience: prev.experience.map(exp =>
        exp.id === id ? { ...exp, ...updates } : exp
      )
    }))
  }, [setState])

  // Add experience
  const addExperience = useCallback(() => {
    setState(prev => ({
      ...prev,
      experience: [
        ...prev.experience,
        {
          id: generateId('exp'),
          include: true,
          company: '',
          role: '',
          dates: '',
          bullets: []
        }
      ]
    }))
  }, [setState])

  // Remove experience
  const removeExperience = useCallback((id: string) => {
    setState(prev => ({
      ...prev,
      experience: prev.experience.filter(exp => exp.id !== id)
    }))
  }, [setState])

  // Update bullet
  const updateBullet = useCallback((expId: string, bulletId: string, key: keyof EditorBullet, value: any) => {
    setState(prev => ({
      ...prev,
      experience: prev.experience.map(exp =>
        exp.id === expId
          ? {
              ...exp,
              bullets: exp.bullets.map(bullet =>
                bullet.id === bulletId ? { ...bullet, [key]: value } : bullet
              )
            }
          : exp
      )
    }))
  }, [setState])

  // Add bullet
  const addBullet = useCallback((expId: string) => {
    setState(prev => ({
      ...prev,
      experience: prev.experience.map(exp =>
        exp.id === expId
          ? {
              ...exp,
              bullets: [
                ...exp.bullets,
                {
                  id: generateId('bullet'),
                  value: '',
                  include: true
                }
              ]
            }
          : exp
      )
    }))
  }, [setState])

  // Remove bullet
  const removeBullet = useCallback((expId: string, bulletId: string) => {
    setState(prev => ({
      ...prev,
      experience: prev.experience.map(exp =>
        exp.id === expId
          ? {
              ...exp,
              bullets: exp.bullets.filter(bullet => bullet.id !== bulletId)
            }
          : exp
      )
    }))
  }, [setState])

  // Update education
  const updateEducation = useCallback((id: string, updates: Partial<EditorEducation>) => {
    setState(prev => ({
      ...prev,
      education: prev.education.map(edu =>
        edu.id === id ? { ...edu, ...updates } : edu
      )
    }))
  }, [setState])

  // Add education
  const addEducation = useCallback(() => {
    setState(prev => ({
      ...prev,
      education: [
        ...prev.education,
        {
          id: generateId('edu'),
          include: true,
          institution: '',
          degree: '',
          field: '',
          location: '',
          start: '',
          end: ''
        }
      ]
    }))
  }, [setState])

  // Remove education
  const removeEducation = useCallback((id: string) => {
    setState(prev => ({
      ...prev,
      education: prev.education.filter(edu => edu.id !== id)
    }))
  }, [setState])

  // Update certification
  const updateCertification = useCallback((id: string, updates: Partial<EditorCertification>) => {
    setState(prev => ({
      ...prev,
      certifications: prev.certifications.map(cert =>
        cert.id === id ? { ...cert, ...updates } : cert
      )
    }))
  }, [setState])

  // Add certification
  const addCertification = useCallback(() => {
    setState(prev => ({
      ...prev,
      certifications: [
        ...prev.certifications,
        {
          id: generateId('cert'),
          include: true,
          name: '',
          issuer: '',
          date: ''
        }
      ]
    }))
  }, [setState])

  // Remove certification
  const removeCertification = useCallback((id: string) => {
    setState(prev => ({
      ...prev,
      certifications: prev.certifications.filter(cert => cert.id !== id)
    }))
  }, [setState])

  // Get included count
  const getIncludedCount = useCallback(() => {
    return countIncludedFields(state)
  }, [state])

  // Save to server
  const save = useCallback(async () => {
    if (isSaving) {
      return
    }
    
    setIsSaving(true)
    try {
      const plainText = generatePlainText(state)
      const databaseFormat = convertEditorStateToDatabase(state)
      
      const response = await fetch(`/api/resumes/${resumeId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: state.targetTitle.value || 'Untitled Resume',
          content_text: plainText,
          parsed_sections: databaseFormat
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(errorData.error || 'Failed to save resume')
      }

      // Mark as just saved and reset dirty flag
      justSavedRef.current = true
      setIsDirty(false)
      setLastSaved(new Date())
      
      // Reset justSaved flag after a short delay
      setTimeout(() => {
        justSavedRef.current = false
      }, 100)
    } catch (error) {
      justSavedRef.current = false
      throw error
    } finally {
      setIsSaving(false)
    }
  }, [state, resumeId, isSaving])

  const value: EditorContextType = {
    state,
    resumeId,
    undo,
    redo,
    canUndo,
    canRedo,
    updateContact,
    updateTargetTitle,
    updateSummary,
    addSummary,
    removeSummary,
    updateSkill,
    addSkill,
    removeSkill,
    updateInterest,
    addInterest,
    removeInterest,
    updateExperience,
    addExperience,
    removeExperience,
    updateBullet,
    addBullet,
    removeBullet,
    updateEducation,
    addEducation,
    removeEducation,
    updateCertification,
    addCertification,
    removeCertification,
    getIncludedCount,
    save,
    isSaving,
    isDirty,
    lastSaved
  }

  return (
    <EditorContext.Provider value={value}>
      {children}
    </EditorContext.Provider>
  )
}
