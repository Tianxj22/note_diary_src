; ============================================================
; build/installer.nsh — Note Diary 自定义 NSIS 安装脚本
;
; 覆盖 electron-builder 内置 CHECK_APP_RUNNING 的默认行为，
; 在手动安装时静默关闭运行中的应用，实现无感覆盖安装。
;
; 钩子机制: electron-builder 的 CHECK_APP_RUNNING 宏在调用
; _CHECK_APP_RUNNING 之前先检查 customCheckAppRunning 是否已定义
; (allowOnlyOneInstallerInstance.nsh:37-39)
; ============================================================

!macro customCheckAppRunning
  ${nsProcess::FindProcess} "${APP_EXECUTABLE_FILENAME}" $R0
  ${If} $R0 == 0
    ; 优雅关闭（发送 WM_CLOSE）
    ${nsProcess::CloseProcess} "${APP_EXECUTABLE_FILENAME}" $R0
    Sleep 2000

    ; 若仍运行则强制终止
    ${nsProcess::FindProcess} "${APP_EXECUTABLE_FILENAME}" $R0
    ${If} $R0 == 0
      ${nsProcess::KillProcess} "${APP_EXECUTABLE_FILENAME}" $R0
      Sleep 1000

      ; 二次重试
      ${nsProcess::FindProcess} "${APP_EXECUTABLE_FILENAME}" $R0
      ${If} $R0 == 0
        ; 进程可能以管理员权限运行，无法终止 → 提示用户手动关闭
        MessageBox MB_OKCANCEL|MB_ICONEXCLAMATION \
          "请手动关闭 ${PRODUCT_NAME} 后再继续安装。" \
          /SD IDOK IDOK +2
        Quit
        ; 用户点击确定 → 最后一次强制终止尝试
        ${nsProcess::KillProcess} "${APP_EXECUTABLE_FILENAME}" $R0
        Sleep 1000
      ${EndIf}
    ${EndIf}
  ${EndIf}
!macroend
