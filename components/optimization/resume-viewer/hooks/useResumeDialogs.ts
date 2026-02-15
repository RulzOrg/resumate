"use client"

import { useState, useCallback } from "react"
import type { ParsedResume, ContactInfo, WorkExperienceItem, EducationItem, ProjectItem, VolunteerItem, PublicationItem } from "@/lib/resume-parser"
import type { SectionId, DialogState } from "../types"

const CLOSED: DialogState = { type: null, index: null, isNew: false }

export function useResumeDialogs(
  resumeData: ParsedResume,
  updateResumeData: (updates: Partial<ParsedResume>) => void
) {
  const [activeDialog, setActiveDialog] = useState<DialogState>(CLOSED)

  const openEdit = useCallback((sectionId: SectionId) => {
    switch (sectionId) {
      case "contact":
      case "target":
      case "summary":
      case "skills":
      case "interests":
      case "certifications":
      case "awards":
        setActiveDialog({ type: sectionId, index: null, isNew: false })
        break
      case "experience":
        if (resumeData.workExperience.length > 0)
          setActiveDialog({ type: sectionId, index: 0, isNew: false })
        break
      case "education":
        if (resumeData.education.length > 0)
          setActiveDialog({ type: sectionId, index: 0, isNew: false })
        break
      case "projects":
        if (resumeData.projects.length > 0)
          setActiveDialog({ type: sectionId, index: 0, isNew: false })
        break
      case "volunteering":
        if (resumeData.volunteering.length > 0)
          setActiveDialog({ type: sectionId, index: 0, isNew: false })
        break
      case "publications":
        if (resumeData.publications.length > 0)
          setActiveDialog({ type: sectionId, index: 0, isNew: false })
        break
    }
  }, [resumeData.workExperience.length, resumeData.education.length, resumeData.projects.length, resumeData.volunteering.length, resumeData.publications.length])

  const openAdd = useCallback((sectionId: SectionId) => {
    setActiveDialog({ type: sectionId, index: null, isNew: true })
  }, [])

  const openEditItem = useCallback((sectionId: SectionId, index: number) => {
    setActiveDialog({ type: sectionId, index, isNew: false })
  }, [])

  const closeDialog = useCallback(() => {
    setActiveDialog(CLOSED)
  }, [])

  // Delete handlers
  const handleDeleteItem = useCallback((sectionId: SectionId, index: number) => {
    switch (sectionId) {
      case "experience":
        updateResumeData({ workExperience: resumeData.workExperience.filter((_, i) => i !== index) })
        break
      case "education":
        updateResumeData({ education: resumeData.education.filter((_, i) => i !== index) })
        break
      case "projects":
        updateResumeData({ projects: resumeData.projects.filter((_, i) => i !== index) })
        break
      case "volunteering":
        updateResumeData({ volunteering: resumeData.volunteering.filter((_, i) => i !== index) })
        break
      case "publications":
        updateResumeData({ publications: resumeData.publications.filter((_, i) => i !== index) })
        break
    }
  }, [resumeData, updateResumeData])

  // Save handlers
  const handleSaveContact = useCallback((contact: ContactInfo) => {
    updateResumeData({ contact })
  }, [updateResumeData])

  const handleSaveExperience = useCallback((experience: WorkExperienceItem) => {
    if (activeDialog.isNew) {
      updateResumeData({ workExperience: [...resumeData.workExperience, experience] })
    } else if (activeDialog.index !== null) {
      const updated = [...resumeData.workExperience]
      updated[activeDialog.index] = experience
      updateResumeData({ workExperience: updated })
    }
  }, [activeDialog, resumeData.workExperience, updateResumeData])

  const handleSaveEducation = useCallback((education: EducationItem) => {
    if (activeDialog.isNew) {
      updateResumeData({ education: [...resumeData.education, education] })
    } else if (activeDialog.index !== null) {
      const updated = [...resumeData.education]
      updated[activeDialog.index] = education
      updateResumeData({ education: updated })
    }
    closeDialog()
  }, [activeDialog, resumeData.education, updateResumeData, closeDialog])

  const handleSaveProject = useCallback((project: ProjectItem) => {
    if (activeDialog.isNew) {
      updateResumeData({ projects: [...resumeData.projects, project] })
    } else if (activeDialog.index !== null) {
      const updated = [...resumeData.projects]
      updated[activeDialog.index] = project
      updateResumeData({ projects: updated })
    }
    closeDialog()
  }, [activeDialog, resumeData.projects, updateResumeData, closeDialog])

  const handleSaveVolunteering = useCallback((volunteering: VolunteerItem) => {
    if (activeDialog.isNew) {
      updateResumeData({ volunteering: [...resumeData.volunteering, volunteering] })
    } else if (activeDialog.index !== null) {
      const updated = [...resumeData.volunteering]
      updated[activeDialog.index] = volunteering
      updateResumeData({ volunteering: updated })
    }
    closeDialog()
  }, [activeDialog, resumeData.volunteering, updateResumeData, closeDialog])

  const handleSavePublication = useCallback((publication: PublicationItem) => {
    if (activeDialog.isNew) {
      updateResumeData({ publications: [...resumeData.publications, publication] })
    } else if (activeDialog.index !== null) {
      const updated = [...resumeData.publications]
      updated[activeDialog.index] = publication
      updateResumeData({ publications: updated })
    }
    closeDialog()
  }, [activeDialog, resumeData.publications, updateResumeData, closeDialog])

  return {
    activeDialog,
    openEdit,
    openAdd,
    openEditItem,
    closeDialog,
    handleDeleteItem,
    handleSaveContact,
    handleSaveExperience,
    handleSaveEducation,
    handleSaveProject,
    handleSaveVolunteering,
    handleSavePublication,
  }
}
