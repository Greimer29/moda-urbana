!macro customInit
  nsExec::ExecToLog 'taskkill /F /IM "Moda Urbana.exe" /T'
  nsExec::ExecToLog 'taskkill /F /IM "Coreva.exe" /T'
  nsExec::ExecToLog 'taskkill /F /IM "Hebra.exe" /T'
  Sleep 1000
!macroend
