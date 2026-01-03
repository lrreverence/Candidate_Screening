import React from 'react'

const ApplicationProgress = ({ currentStep = 1, totalSteps = 3 }) => {
  const stepLabels = [
    'Step 1: Personal Info & Qualifications',
    'Step 2: Documents',
    'Step 3: Review & Submit'
  ]

  const progressPercentage = (currentStep / totalSteps) * 100

  return (
    <div className="bg-white dark:bg-[#1e293b] p-6 rounded-xl border border-gray-200 dark:border-white/5 mb-10 shadow-sm">
      <div className="flex justify-between mb-4 text-sm font-medium">
        <span className="text-primary">{stepLabels[currentStep - 1] || `Step ${currentStep}`}</span>
        <span className="text-gray-400">Step {currentStep} of {totalSteps}</span>
      </div>
      <div className="w-full bg-gray-200 dark:bg-black/30 rounded-full h-2.5">
        <div 
          className="bg-primary h-2.5 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.5)] transition-all duration-300"
          style={{ width: `${progressPercentage}%` }}
        ></div>
      </div>
    </div>
  )
}

export default ApplicationProgress

