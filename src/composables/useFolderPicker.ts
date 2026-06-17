/**
 * useFolderPicker - 文件夹选择 Composable
 *
 * 封装 showDirectoryPicker / 传统 input[type=file] 文件夹选择逻辑。
 * 支持回退方案以兼容旧浏览器。
 */

import { ref } from 'vue';

export function useFolderPicker() {
  const folderInput = ref<HTMLInputElement | null>(null);

  /**
   * 弹出现代文件夹选择器（如可用），并将选择的文件夹名合并到当前路径。
   * @param currentPath 当前路径（可能为空）
   * @returns 解析为最终的路径字符串
   */
  async function pickFolder(currentPath: string): Promise<string | null> {
    // 尝试使用 showDirectoryPicker API
    if ('showDirectoryPicker' in window) {
      try {
        const directoryHandle = await (window as any).showDirectoryPicker();
        const folderName: string = directoryHandle.name;

        if (currentPath) {
          const sep = currentPath.includes('\\') ? '\\' : '/';
          const parts = currentPath.split(/[\\/]/);
          parts[parts.length - 1] = folderName;
          return parts.join(sep);
        }
        return folderName;
      } catch (e) {
        console.error('📁 使用 showDirectoryPicker 失败:', e);
        // 继续走传统 input file
      }
    }
    // 回退到传统 input file
    if (folderInput.value) {
      folderInput.value.click();
    }
    return null;
  }

  /**
   * 处理传统 input[type=file] 的 change 事件。
   * 由于浏览器安全限制，只能拿到文件夹名称（不是绝对路径）。
   */
  function handleFolderSelect(event: Event, onPicked: (folderName: string) => void) {
    const target = event.target as HTMLInputElement;
    if (target.files && target.files.length > 0) {
      const file = target.files[0];
      try {
        if (file.webkitRelativePath) {
          const folderName = file.webkitRelativePath.split('/')[0];
          onPicked(folderName);
        } else {
          onPicked('');
        }
      } catch (err) {
        console.error('📁 提取文件夹路径失败:', err);
        onPicked('');
      }
      if (folderInput.value) {
        folderInput.value.value = '';
      }
    }
  }

  return {
    folderInput,
    pickFolder,
    handleFolderSelect
  };
}
