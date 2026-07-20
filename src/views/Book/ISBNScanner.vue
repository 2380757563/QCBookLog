<template>
  <div class="isbn-scanner-container">
    <!-- 顶部导航栏 -->
    <div class="header">
      <button class="back-btn" @click="goBack">
        <svg viewBox="0 0 24 24"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>
      </button>
      <h1 class="title">ISBN扫描</h1>
      <div class="header-right">
        <span v-if="scannedIsbnList.length > 0" class="scan-count">{{ scannedIsbnList.length }}</span>
      </div>
    </div>

    <!-- 扫描区域 -->
    <div class="scanner-section">
      <!-- 摄像头预览容器 -->
      <div class="camera-container">
        <!-- 摄像头未启动提示 -->
        <div v-if="!isCameraActive" class="camera-placeholder">
          <div class="placeholder-icon">📷</div>
          <p class="placeholder-text">点击"开始扫描"按钮启动摄像头</p>
          <p class="placeholder-hint">请确保已授予摄像头权限</p>
        </div>
        
        <!-- 视频元素 -->
        <video 
          ref="videoElement" 
          class="video-preview" 
          autoplay 
          playsinline
          muted
          :style="{ display: isCameraActive ? 'block' : 'none' }"
        ></video>
        
        <!-- 扫描框 -->
        <div v-if="isCameraActive" class="scanner-frame">
          <div class="corner top-left"></div>
          <div class="corner top-right"></div>
          <div class="corner bottom-left"></div>
          <div class="corner bottom-right"></div>
          <div class="scanner-line"></div>
        </div>
        
        <!-- 图像质量提示 -->
        <div v-if="isCameraActive && showQualityTip" class="quality-tip">
          <div class="quality-tip-content">
            <span class="quality-icon">💡</span>
            <span class="quality-text">{{ qualityTipText }}</span>
            <button class="quality-close" @click="showQualityTip = false">×</button>
          </div>
        </div>
        
        <!-- 扫描中提示 -->
        <div v-if="isCameraActive && !scannedResult" class="scanning-hint">
          <p>正在扫描...请将ISBN条码对准扫描框</p>
          <p v-if="imageQuality.overallScore < 50" class="quality-warning">⚠️ 图像质量较低，建议调整拍摄距离或光线</p>
        </div>
      </div>
      
      <!-- 切换提示 -->
      <div v-if="showSwitchingHint" class="switching-hint">
        <span>正在切换摄像头...</span>
      </div>
      
      <!-- 控制按钮区域 -->
      <div class="camera-controls-container">
        <div class="camera-controls">
          <button class="control-btn" @click="toggleCamera">
            {{ isCameraActive ? '停止扫描' : '开始扫描' }}
          </button>
          <button class="control-btn" @click="switchCamera" :disabled="!hasMultipleCameras">
            切换摄像头
          </button>
          <button class="control-btn" @click="triggerFileInput">
            从图片扫描
          </button>
        </div>
        <!-- 隐藏的文件输入 -->
        <input 
          ref="fileInput" 
          type="file" 
          accept="image/jpeg,image/png,image/gif,image/webp" 
          class="file-input" 
          @change="handleFileSelect"
        />
      </div>
      
      <!-- 扫描设置面板 -->
      <div v-if="isCameraActive" class="settings-panel">
        <button class="settings-toggle" @click="showSettings = !showSettings">
          <svg viewBox="0 0 24 24"><path d="M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.07-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61 l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41 h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.92,7.63,6.29L5.24,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.74,8.87 C2.62,9.08,2.66,9.34,2.86,9.48l2.03,1.58C4.84,11.36,4.8,11.69,4.8,12s0.02,0.64,0.07,0.94l-2.03,1.58 c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54 c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.44-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96 c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.12-0.22,0.07-0.47-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6 s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z"/></svg>
          <span>{{ showSettings ? '收起设置' : '扫描设置' }}</span>
        </button>
        
        <div v-if="showSettings" class="settings-content">
          <!-- 分辨率设置 -->
          <div class="setting-item">
            <label class="setting-label">分辨率</label>
            <select v-model="selectedResolution" class="setting-select" @change="applySettings">
              <option value="high">高清 (1920x1080)</option>
              <option value="medium">标准 (1280x720)</option>
              <option value="low">流畅 (640x480)</option>
            </select>
          </div>
          
          <!-- 扫描距离提示 -->
          <div class="setting-item">
            <label class="setting-label">拍摄提示</label>
            <div class="scan-tips">
              <div class="tip-item">
                <span class="tip-icon">📏</span>
                <span class="tip-text">保持 10-20cm 距离</span>
              </div>
              <div class="tip-item">
                <span class="tip-icon">💡</span>
                <span class="tip-text">确保光线充足</span>
              </div>
              <div class="tip-item">
                <span class="tip-icon">📐</span>
                <span class="tip-text">保持条码水平</span>
              </div>
            </div>
          </div>
          
          <!-- 图像质量显示 -->
          <div class="setting-item">
            <label class="setting-label">图像质量</label>
            <div class="quality-metrics">
              <div class="metric-item">
                <span class="metric-label">锐度</span>
                <div class="metric-bar">
                  <div class="metric-fill" :style="{ width: imageQuality.sharpness + '%', backgroundColor: getQualityColor(imageQuality.sharpness) }"></div>
                </div>
                <span class="metric-value">{{ imageQuality.sharpness }}</span>
              </div>
              <div class="metric-item">
                <span class="metric-label">亮度</span>
                <div class="metric-bar">
                  <div class="metric-fill" :style="{ width: imageQuality.brightness + '%', backgroundColor: getQualityColor(imageQuality.brightness) }"></div>
                </div>
                <span class="metric-value">{{ imageQuality.brightness }}</span>
              </div>
              <div class="metric-item">
                <span class="metric-label">对比度</span>
                <div class="metric-bar">
                  <div class="metric-fill" :style="{ width: imageQuality.contrast + '%', backgroundColor: getQualityColor(imageQuality.contrast) }"></div>
                </div>
                <span class="metric-value">{{ imageQuality.contrast }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ISBN输入备用 -->
    <div class="input-section">
      <div class="input-group">
        <input 
          v-model="manualIsbn" 
          class="isbn-input" 
          placeholder="手动输入ISBN" 
          @keyup.enter="onManualInput"
        />
        <button class="btn-primary" @click="onManualInput">确认</button>
      </div>
    </div>

    <!-- 结果展示 -->
    <div v-if="scannedResult" class="result-section">
      <div class="result-card">
        <div class="result-header">
          <div class="result-icon">✅</div>
          <h2>扫描成功</h2>
        </div>
        <div class="result-content">
          <p class="isbn-text">ISBN: {{ scannedResult }}</p>
          <div class="result-actions">
            <button class="btn-primary" @click="addToListAndContinue">添加并继续</button>
            <button class="btn-outline" @click="resetScan">继续扫描</button>
            <button class="btn-secondary" @click="useScannedIsbn">使用此ISBN</button>
          </div>
        </div>
      </div>
    </div>

    <!-- 已扫描的ISBN列表 -->
    <div v-if="scannedIsbnList.length > 0" class="scanned-list-section">
      <div class="list-header">
        <h3>已扫描列表 ({{ scannedIsbnList.length }})</h3>
        <div class="list-actions">
          <button class="action-btn small" @click="selectAllIsbn">全选</button>
          <button class="action-btn small" @click="invertSelection">反选</button>
          <button class="action-btn small danger" @click="deleteSelected" :disabled="selectedIsbns.length === 0">
            删除({{ selectedIsbns.length }})
          </button>
        </div>
      </div>
      <div class="scanned-list">
        <div 
          v-for="(isbn, index) in scannedIsbnList" 
          :key="isbn"
          :class="['scanned-item', { 'selected': selectedIsbns.includes(isbn) }]"
          @click="toggleIsbnSelection(isbn)"
        >
          <div class="item-checkbox">
            <input 
              type="checkbox" 
              :checked="selectedIsbns.includes(isbn)"
              @click.stop
              @change="toggleIsbnSelection(isbn)"
            />
          </div>
          <span class="item-index">{{ index + 1 }}</span>
          <span class="item-isbn">{{ isbn }}</span>
          <button class="item-remove" @click.stop="removeIsbn(isbn)">×</button>
        </div>
      </div>
      <div class="list-footer">
        <button class="clear-all-btn" @click="clearAllIsbns">清空列表</button>
        <button class="batch-search-btn" @click="batchSearch">
          批量搜索 ({{ selectedIsbns.length > 0 ? selectedIsbns.length : scannedIsbnList.length }})
        </button>
      </div>
    </div>

    <!-- 错误提示 -->
    <div v-if="error" class="error-section">
      <div class="error-card">
        <div class="error-icon">❌</div>
        <h3>扫描失败</h3>
        <p>{{ error }}</p>
        <button class="btn-primary" @click="clearError">重试</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { BrowserBarcodeReader } from '@zxing/library';
import { isbnImageScannerService } from '@/api/common/isbnImageScanner';
import { detectImageQuality, type ImageQualityMetrics } from '@/utils/imageEnhancer';

const router = useRouter();
const route = useRoute();

// 视频元素引用
const videoElement = ref<HTMLVideoElement | null>(null);
// 文件输入引用
const fileInput = ref<HTMLInputElement | null>(null);

// 状态管理
const isCameraActive = ref(false);
const hasMultipleCameras = ref(false);
const manualIsbn = ref('');
const scannedResult = ref('');
const error = ref('');
const isScanningFromImage = ref(false);
const showSettings = ref(false);
const showQualityTip = ref(false);
const qualityTipText = ref('');

// 扫描设置
const selectedResolution = ref<'high' | 'medium' | 'low'>('high');
const imageQuality = ref<ImageQualityMetrics>({
  brightness: 50,
  contrast: 50,
  sharpness: 50,
  noise: 50,
  overallScore: 50
});

// 摄像头相关
let codeReader: BrowserBarcodeReader | null = null;
let isScanning = false;
let availableCameras: MediaDeviceInfo[] = [];
let currentDeviceId: string | null = null;
let qualityCheckInterval: number | null = null;
const permissionGranted = ref(false);
const showSwitchingHint = ref(false);

const scannedIsbnList = ref<string[]>([]);
const selectedIsbns = ref<string[]>([]);

const isFromBatch = ref(false);

// 分辨率配置
const resolutionConfig = {
  high: { width: 1920, height: 1080, frameRate: 30 },
  medium: { width: 1280, height: 720, frameRate: 30 },
  low: { width: 640, height: 480, frameRate: 30 }
};

// 初始化ZXing条码阅读器
const initCodeReader = () => {
  if (!codeReader) {
    try {
      codeReader = new BrowserBarcodeReader();
      return true;
    } catch (e) {
      console.error('❌ ZXing条码阅读器初始化失败:', e);
      error.value = '条码检测功能初始化失败';
      return false;
    }
  }
  return true;
};

// 获取可用摄像头列表
const getAvailableCameras = async (forceRefresh = false): Promise<void> => {
  try {
    if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {

      hasMultipleCameras.value = false;
      currentDeviceId = null;
      return;
    }
    
    // 首次调用时需要先请求一次媒体流权限才能获取设备标签
    if (!permissionGranted.value || forceRefresh) {
      try {
        const tempStream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'environment' }, 
          audio: false 
        });
        // 立即停止临时流
        tempStream.getTracks().forEach(track => track.stop());
        permissionGranted.value = true;

      } catch (permError) {

        permissionGranted.value = false;
        // 不返回,继续尝试获取设备列表
      }
    }
    
    const devices = await navigator.mediaDevices.enumerateDevices();
    const videoDevices = devices.filter(device => device.kind === 'videoinput');
    
    // 过滤掉禁用的摄像头
    availableCameras = videoDevices.filter(device => {
      try {
        // 尝试获取设备能力(如果设备不可用会抛出异常)
        return device.deviceId && device.deviceId !== '';
      } catch {
        return false;
      }
    });


    availableCameras.forEach((cam, idx) => {
      const label = cam.label || '(未授权 - 需要摄像头权限)';
      console.log(`  [${idx}] ID: ${cam.deviceId.substring(0, 12)}... | Label: ${label}`);
    });
    
    hasMultipleCameras.value = availableCameras.length > 1;
    
    // 如果没有获取到摄像头信息,显示提示
    if (availableCameras.length === 0) {




      currentDeviceId = null;
      return;
    }
    
    // 摄像头分类和排序
    const classifiedCameras = classifyCameras(availableCameras);
    
    // 选择最佳摄像头
    const selectedCamera = selectBestCamera(classifiedCameras);
    
    if (selectedCamera) {
      currentDeviceId = selectedCamera.deviceId;

    } else {
      currentDeviceId = null;

    }
    
    console.log('📷 当前使用摄像头ID:', currentDeviceId?.substring(0, 12) + '...');
  } catch (e) {
    console.error('❌ 获取摄像头列表失败:', e);
    hasMultipleCameras.value = false;
    currentDeviceId = null;
  }
};

// 摄像头分类函数
const classifyCameras = (cameras: MediaDeviceInfo[]) => {
  const excludedKeywords = ['wide', 'ultra', 'ultrawide', '0.5', '0.8', 'macro', 'super wide', '广角', '超广', '微距', '0.5x', '0.8x'];
  const mainKeywords = ['main', '1x', 'primary', 'camera1', 'main camera'];
  const backKeywords = ['back', 'environment', 'rear', '后置', 'back camera', 'camera0'];
  const frontKeywords = ['front', 'user', '前置', 'front camera'];
  
  return cameras.reduce((acc, camera) => {
    const label = camera.label.toLowerCase();
    const isExcluded = excludedKeywords.some(keyword => label.includes(keyword));
    
    if (isExcluded) {

      return acc;
    }
    
    if (mainKeywords.some(keyword => label.includes(keyword))) {
      acc.mainCameras.push(camera);
    } else if (backKeywords.some(keyword => label.includes(keyword))) {
      acc.backCameras.push(camera);
    } else if (frontKeywords.some(keyword => label.includes(keyword))) {
      acc.frontCameras.push(camera);
    } else {
      acc.otherCameras.push(camera);
    }
    
    return acc;
  }, {
    mainCameras: [] as MediaDeviceInfo[],
    backCameras: [] as MediaDeviceInfo[],
    frontCameras: [] as MediaDeviceInfo[],
    otherCameras: [] as MediaDeviceInfo[]
  });
};

// 选择最佳摄像头
const selectBestCamera = (classified: {
  mainCameras: MediaDeviceInfo[];
  backCameras: MediaDeviceInfo[];
  frontCameras: MediaDeviceInfo[];
  otherCameras: MediaDeviceInfo[];
}) => {
  // 优先级1: 主摄像头
  if (classified.mainCameras.length > 0) {

    return classified.mainCameras[0];
  }
  
  // 优先级2: 后置摄像头
  if (classified.backCameras.length > 0) {
    // 如果有多个后置摄像头,选择第二个(通常是主摄)
    if (classified.backCameras.length > 1) {

      return classified.backCameras[1];
    }

    return classified.backCameras[0];
  }
  
  // 优先级3: 其他摄像头
  if (classified.otherCameras.length > 0) {

    return classified.otherCameras[0];
  }
  
  // 优先级4: 前置摄像头
  if (classified.frontCameras.length > 0) {

    return classified.frontCameras[0];
  }
  
  return null;
};

// 初始化摄像头
const initCamera = async () => {
  try {
    error.value = '';
    
    // 确保ZXing阅读器已初始化
    if (!codeReader && !initCodeReader()) {
      error.value = '条码检测功能初始化失败';
      return;
    }
    
    // 如果没有获取到摄像头列表,先获取
    if (availableCameras.length === 0) {
      await getAvailableCameras();
      
      if (availableCameras.length === 0) {
        error.value = '未检测到摄像头,请检查设备是否有摄像头并已授予权限';
        return;
      }
    }
    
    // 获取当前分辨率配置
    const config = resolutionConfig[selectedResolution.value];
    
    // 构建视频约束
    const videoConstraints: MediaTrackConstraints = {
      width: { ideal: config.width },
      height: { ideal: config.height },
      frameRate: { ideal: config.frameRate }
    };
    
    // 如果有指定的设备ID,使用它
    if (currentDeviceId) {
      videoConstraints.deviceId = { exact: currentDeviceId };
      console.log('✅ 使用指定摄像头设备ID:', currentDeviceId.substring(0, 12) + '...');
    } else {
      // 否则使用后置摄像头
      videoConstraints.facingMode = { ideal: 'environment' };

    }
    
    const mediaConstraints = {
      video: videoConstraints,
      audio: false
    };
    
    // 确保videoElement已挂载
    if (!videoElement.value) {
      error.value = '摄像头初始化失败:视频元素未找到';
      console.error('❌ videoElement.value 为 null');
      return;
    }

    // 获取媒体流
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia(mediaConstraints);
    } catch (streamError) {
      // 如果指定的摄像头失败,尝试使用第一个可用摄像头
      if (currentDeviceId && availableCameras.length > 0) {

        delete videoConstraints.deviceId;
        videoConstraints.facingMode = { ideal: 'environment' };
        currentDeviceId = availableCameras[0].deviceId;
        stream = await navigator.mediaDevices.getUserMedia(mediaConstraints);
      } else {
        throw streamError;
      }
    }
    
    // 检查实际使用的分辨率
    const videoTrack = stream.getVideoTracks()[0];
    const settings = videoTrack.getSettings();
    console.log('📹 实际摄像头设置:', {
      width: settings.width,
      height: settings.height,
      frameRate: settings.frameRate,
      facingMode: settings.facingMode,
      deviceId: settings.deviceId?.substring(0, 12) + '...'
    });
    
    // 设置视频流到video元素
    videoElement.value.srcObject = stream;
    
    // 等待视频加载完成
    await new Promise<void>((resolve, reject) => {
      if (!videoElement.value) {
        reject(new Error('videoElement为null'));
        return;
      }
      
      const timeout = setTimeout(() => {
        reject(new Error('视频加载超时'));
      }, 10000); // 10秒超时
      
      videoElement.value.onloadedmetadata = () => {
        clearTimeout(timeout);

        resolve();
      };
      
      videoElement.value.onerror = (e) => {
        clearTimeout(timeout);
        reject(e);
      };
    });
    
    // 启动图像质量检测
    startQualityCheck();
    
    // 重置并启动ZXing扫描
    if (codeReader) {
      try {
        // 先重置之前的扫描
        codeReader.reset();
        
        isCameraActive.value = true;
        isScanning = true;
        
        // 启动新的扫描
        codeReader.decodeFromVideoDevice(
          currentDeviceId,
          videoElement.value,
          (result, err) => {
            if (result) {
              console.log('✅ 扫描成功:', result.getText());
              scannedResult.value = result.getText();
              isScanning = false;
              stopQualityCheck();
            }
            
            if (err) {
              const errName = err.name || '';
              const errMessage = err.message || '';
              const errString = String(err);
              const errConstructor = err.constructor?.name || '';
              
              const isNotFoundError = [
                'NotFoundException', 'NotFoundException2', 'NotFoundError',
                'MultiFormatReaderException', 'NoCodeDetectedException'
              ].some(errorType => 
                errName.includes(errorType) || 
                errMessage.includes(errorType) || 
                errString.includes(errorType) ||
                errConstructor.includes(errorType)
              );
              
              const isNormalScanning = 
                errName === 'e' ||
                errString.includes('No code') ||
                errString.includes('not found') ||
                errString.includes('NotFoundException');
              
              if (isNotFoundError || isNormalScanning) {
                return;
              }
              
              let errorMsg = '扫描错误';
              
              if (errMessage.includes('Could not start video source') || 
                  errString.includes('Could not start video source')) {
                errorMsg = '无法启动摄像头,请检查摄像头是否被其他应用占用';
              } else if (errName === 'NotAllowedError') {
                errorMsg = '请在浏览器设置中允许摄像头权限';
              } else if (errName === 'NotFoundError') {
                errorMsg = '未检测到摄像头,请检查设备';
              } else if (errName === 'NotReadableError') {
                errorMsg = '摄像头被占用,请关闭其他应用';
              } else if (errName === 'OverconstrainedError') {
                errorMsg = '当前分辨率不支持,请尝试降低分辨率';
              } else if (errMessage) {
                errorMsg = `扫描错误: ${errMessage}`;
              } else if (errName && errName.length > 1) {
                errorMsg = `扫描错误: ${errName}`;
              } else {
                console.log('ℹ️ 扫描中...未检测到条码');
                return;
              }
              
              console.error('❌ 扫描错误:', errorMsg, err);
              error.value = errorMsg;
              isCameraActive.value = false;
              isScanning = false;
              stopQualityCheck();
              
              // 停止视频流
              if (stream) {
                stream.getTracks().forEach(track => track.stop());
              }
              if (videoElement.value) {
                videoElement.value.srcObject = null;
              }
            }
          }
        );

      } catch (zxingError) {
        console.error('❌ 启动ZXing扫描失败:', zxingError);
        throw zxingError;
      }
    }
  } catch (e) {
    let errorMsg = '无法访问摄像头';
    
    if (e instanceof DOMException) {
      switch (e.name) {
        case 'NotAllowedError':
          errorMsg = '请在浏览器设置中允许摄像头权限';
          break;
        case 'NotFoundError':
          errorMsg = '未检测到摄像头,请检查设备是否有摄像头';
          break;
        case 'NotReadableError':
          errorMsg = '摄像头被占用,请关闭其他使用摄像头的应用';
          break;
        case 'OverconstrainedError':
          errorMsg = '当前分辨率不支持,正在尝试降低分辨率...';
          selectedResolution.value = 'medium';
          break;
        case 'TypeError':
          errorMsg = '摄像头参数错误,请重试';
          break;
        default:
          errorMsg = `摄像头错误: ${e.message}`;
      }
    } else if (e instanceof Error) {
      errorMsg = `摄像头错误: ${e.message}`;
    }
    
    console.error('❌ 初始化摄像头失败:', e);
    error.value = errorMsg;
    isCameraActive.value = false;
    isScanning = false;
    
    // 停止任何可能存在的视频流
    if (videoElement.value && videoElement.value.srcObject) {
      const stream = videoElement.value.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoElement.value.srcObject = null;
    }
  }
};

// 停止摄像头
const stopCamera = () => {

  // 停止 ZXing 阅读器
  if (codeReader) {
    try {
      codeReader.reset();

    } catch (e) {

    }
  }
  
  // 停止质量检测
  stopQualityCheck();
  
  // 停止视频流
  if (videoElement.value) {
    const stream = videoElement.value.srcObject as MediaStream;
    if (stream) {
      stream.getTracks().forEach(track => {

        track.stop();
      });
    }
    videoElement.value.srcObject = null;

  }
  
  isCameraActive.value = false;
  isScanning = false;
  scannedResult.value = '';

};

// 图像质量检测
const checkImageQuality = () => {
  if (!videoElement.value || !videoElement.value.videoWidth) {
    return;
  }
  
  try {
    // 创建临时 Canvas 进行质量检测
    const canvas = document.createElement('canvas');
    const scale = 0.25; // 降低分辨率以提高性能
    canvas.width = videoElement.value.videoWidth * scale;
    canvas.height = videoElement.value.videoHeight * scale;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.drawImage(videoElement.value, 0, 0, canvas.width, canvas.height);
    
    const quality = detectImageQuality(canvas);
    imageQuality.value = quality;
    
    // 根据质量显示提示
    if (quality.sharpness < 40) {
      qualityTipText.value = '图像模糊，请调整拍摄距离';
      showQualityTip.value = true;
    } else if (quality.brightness < 30) {
      qualityTipText.value = '光线不足，请增加光线';
      showQualityTip.value = true;
    } else if (quality.contrast < 40) {
      qualityTipText.value = '对比度过低，请调整光线';
      showQualityTip.value = true;
    } else {
      showQualityTip.value = false;
    }
  } catch (e) {
    console.error('图像质量检测失败:', e);
  }
};

// 启动质量检测
const startQualityCheck = () => {
  stopQualityCheck();
  // 每2秒检测一次图像质量
  qualityCheckInterval = window.setInterval(checkImageQuality, 2000);
};

// 停止质量检测
const stopQualityCheck = () => {
  if (qualityCheckInterval !== null) {
    clearInterval(qualityCheckInterval);
    qualityCheckInterval = null;
  }
};

// 切换摄像头状态
const toggleCamera = async () => {
  if (isCameraActive.value) {
    stopCamera();
  } else {
    await initCamera();
  }
};

// 切换前后摄像头
const switchCamera = async () => {
  try {
    // 检查是否有多个摄像头
    if (!hasMultipleCameras.value) {

      error.value = '设备只有一个摄像头,无法切换';
      return;
    }
    
    // 检查摄像头列表
    if (availableCameras.length === 0) {

      await getAvailableCameras(true); // 强制刷新
    
      if (availableCameras.length === 0) {
        error.value = '未检测到摄像头,请检查设备设置';
        return;
      }
    }
    
    // 停止当前摄像头和扫描
    stopCamera();
    
    // 停止 ZXing 阅读器
    if (codeReader) {
      try {
        codeReader.reset();

      } catch (e) {

      }
    }
    
    // 等待一段时间确保资源完全释放
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // 排除广角/超广角/微距镜头
    const excludedKeywords = [
      'wide', 'ultra', 'ultrawide', '0.5', '0.8', 'macro', 'super wide',
      '广角', '超广', '微距', '0.5x', '0.8x', 'tele', 'long'
    ];
    
    // 筛选出可用的摄像头
    const filteredCameras = availableCameras.filter(device => {
      const label = device.label.toLowerCase();
      const isExcluded = excludedKeywords.some(keyword => label.includes(keyword));
      return !isExcluded && device.deviceId;
    });
    
    // 如果筛选后没有摄像头,使用原始列表
    const camerasToUse = filteredCameras.length > 0 ? filteredCameras : availableCameras;
    
    // 查找当前摄像头在列表中的索引
    const currentIndex = camerasToUse.findIndex(cam => cam.deviceId === currentDeviceId);
    
    // 如果找不到当前摄像头(可能已被移除),从第一个开始
    let nextIndex: number;
    if (currentIndex === -1) {

      nextIndex = 0;
    } else {
      nextIndex = (currentIndex + 1) % camerasToUse.length;
    }
    
    const nextCamera = camerasToUse[nextIndex];
    
    // 更新当前设备ID
    currentDeviceId = nextCamera.deviceId;

    console.log('   设备ID:', nextCamera.deviceId.substring(0, 12) + '...');
    console.log('   设备名称:', nextCamera.label || '(未授权)');

    // 显示切换提示
    showSwitchingHint.value = true;
    setTimeout(() => {
      showSwitchingHint.value = false;
    }, 1500);
    
    // 重新初始化摄像头
    await initCamera();

  } catch (e) {
    console.error('❌ 切换摄像头失败:', e);
    error.value = '切换摄像头失败,请重试';
    
    // 尝试恢复到默认摄像头
    if (availableCameras.length > 0) {
      currentDeviceId = availableCameras[0].deviceId;
      try {
        await initCamera();
      } catch (retryError) {
        console.error('恢复摄像头也失败:', retryError);
      }
    }
  }
};

// 应用设置
const applySettings = async () => {
  if (isCameraActive.value) {
    stopCamera();
    await initCamera();
  }
};

// 获取质量颜色
const getQualityColor = (score: number): string => {
  if (score >= 70) return '#4CAF50';
  if (score >= 50) return '#FF9800';
  return '#F44336';
};

// 处理手动输入
const onManualInput = () => {
  if (manualIsbn.value.trim()) {
    scannedResult.value = manualIsbn.value.trim();
    isScanning = false;
    if (codeReader) {
      codeReader.reset();
    }
  }
};

// 使用扫描结果
const useScannedIsbn = () => {
  if (scannedResult.value) {

    const routeQuery = route.query;
    
    const fromBatch = routeQuery.from === 'batch';
    
    if (fromBatch) {
      router.push({
        name: 'BatchScanner',
        query: { isbn: scannedResult.value }
      });
    } else {
      router.push({
        name: 'ISBNBookSearch',
        query: { isbn: scannedResult.value }
      });
    }
    
    scannedResult.value = '';
  }
};

const addToListAndContinue = () => {
  if (scannedResult.value) {
    if (!scannedIsbnList.value.includes(scannedResult.value)) {
      scannedIsbnList.value.push(scannedResult.value);
    }
    resetScan();
  }
};

const toggleIsbnSelection = (isbn: string) => {
  const index = selectedIsbns.value.indexOf(isbn);
  if (index > -1) {
    selectedIsbns.value.splice(index, 1);
  } else {
    selectedIsbns.value.push(isbn);
  }
};

const selectAllIsbn = () => {
  selectedIsbns.value = [...scannedIsbnList.value];
};

const invertSelection = () => {
  selectedIsbns.value = scannedIsbnList.value.filter(isbn => !selectedIsbns.value.includes(isbn));
};

const removeIsbn = (isbn: string) => {
  const index = scannedIsbnList.value.indexOf(isbn);
  if (index > -1) {
    scannedIsbnList.value.splice(index, 1);
  }
  const selectedIndex = selectedIsbns.value.indexOf(isbn);
  if (selectedIndex > -1) {
    selectedIsbns.value.splice(selectedIndex, 1);
  }
};

const deleteSelected = () => {
  scannedIsbnList.value = scannedIsbnList.value.filter(isbn => !selectedIsbns.value.includes(isbn));
  selectedIsbns.value = [];
};

const clearAllIsbns = () => {
  if (confirm('确定要清空所有已扫描的ISBN吗？')) {
    scannedIsbnList.value = [];
    selectedIsbns.value = [];
  }
};

const batchSearch = () => {
  const isbnsToSearch = selectedIsbns.value.length > 0 ? selectedIsbns.value : scannedIsbnList.value;
  
  if (isbnsToSearch.length === 0) {
    alert('请先扫描ISBN');
    return;
  }
  
  router.push({
    name: 'BatchScanner',
    query: { isbn: isbnsToSearch.join(',') }
  });
};

// 重置扫描
const resetScan = () => {
  scannedResult.value = '';
  error.value = '';
  
  if (isCameraActive.value && codeReader) {
    isScanning = true;
    startQualityCheck();
  }
};

// 清除错误
const clearError = () => {
  error.value = '';
};

// 触发文件选择
const triggerFileInput = () => {
  fileInput.value?.click();
};

// 处理文件选择
const handleFileSelect = async (event: Event) => {
  const target = event.target as HTMLInputElement;
  if (!target.files || target.files.length === 0) {
    return;
  }
  
  const file = target.files[0];

  isScanningFromImage.value = true;
  error.value = '';
  
  try {
    const result = await isbnImageScannerService.scanFromFile(file, {
      enablePreprocessing: true,
      maxWidth: 1920,
      maxHeight: 1080,
      onlyValidIsbn: true
    });

    if (result.validationResult === 'VALID') {
      scannedResult.value = result.processedIsbn || result.rawValue;

      isScanning = false;
      if (codeReader) {
        codeReader.reset();
      }
    } else if (result.validationResult === 'INVALID_CHECKSUM') {
      error.value = '识别到条码但校验失败，请重新拍摄';

    } else if (result.validationResult === 'INVALID_FORMAT') {
      error.value = '无法识别ISBN格式，请确保图片清晰且包含完整条码';

    } else {
      error.value = result.error || '无法识别图片中的ISBN条码，请尝试拍摄更清晰的照片';

    }
  } catch (e) {
    console.error('❌ 图片扫描异常:', e);
    let errorMessage = '图片扫描失败';
    
    if (e instanceof Error) {
      if (e.message.includes('Canvas')) {
        errorMessage = '图片处理失败，请尝试其他图片';
      } else if (e.message.includes('Too large')) {
        errorMessage = '图片过大，请选择小于10MB的图片';
      } else if (e.message.includes('format')) {
        errorMessage = '不支持的图片格式，请使用JPG或PNG';
      } else {
        errorMessage = e.message;
      }
    }
    
    error.value = errorMessage;
  } finally {
    isScanningFromImage.value = false;
    if (target) {
      target.value = '';
    }
  }
};

// 返回上一页
const goBack = () => {
  router.back();
};

// 生命周期钩子
onMounted(() => {
  // 页面加载时无需提前初始化阅读器
  // 监听设备插拔
  if (navigator.mediaDevices && navigator.mediaDevices.addEventListener) {
    navigator.mediaDevices.addEventListener('devicechange', async () => {

      await getAvailableCameras(true);
    });
  }
});

onUnmounted(() => {
  stopCamera();
  stopQualityCheck();
  codeReader = null;
});
</script>

<style scoped>
.isbn-scanner-container {
  min-height: 100vh;
  background-color: #f5f5f5;
  display: flex;
  flex-direction: column;
}

/* 顶部导航栏 */
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem;
  background-color: #fff;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.back-btn {
  background: none;
  border: none;
  font-size: 1.2rem;
  cursor: pointer;
  padding: 0.5rem;
  color: #333;
}

.title {
  font-size: 1.2rem;
  font-weight: 600;
  margin: 0;
  color: #333;
}

.header-spacer {
  width: 2rem;
}

.header-right {
  width: 2rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.scan-count {
  background-color: #4CAF50;
  color: #fff;
  font-size: 0.85rem;
  font-weight: 600;
  padding: 0.25rem 0.5rem;
  border-radius: 12px;
  min-width: 1.5rem;
  text-align: center;
}

/* 扫描区域 */
.scanner-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  gap: 1rem;
}

.camera-container {
  width: 100%;
  max-width: 400px;
  height: 60vh;
  position: relative;
  overflow: hidden;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  background-color: #000;
}

.video-preview {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transform: rotate(0deg) translateZ(0);
  -webkit-transform: rotate(0deg) translateZ(0);
  will-change: transform;
  -webkit-will-change: transform;
}

/* 扫描框 */
.scanner-frame {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 90%;
  height: 50%;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 8px;
  pointer-events: none;
  overflow: hidden;
}

.corner {
  position: absolute;
  width: 20px;
  height: 20px;
  border: 3px solid #4CAF50;
}

.scanner-line {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 2px;
  background-color: #4CAF50;
  opacity: 0.8;
  animation: scan-line 2s infinite linear;
  pointer-events: none;
}

@keyframes scan-line {
  0% {
    transform: translateY(-100%);
  }
  100% {
    transform: translateY(100%);
  }
}

/* 图像质量提示 */
.quality-tip {
  position: absolute;
  top: 1rem;
  left: 50%;
  transform: translateX(-50%);
  z-index: 20;
  max-width: 90%;
}

.quality-tip-content {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background-color: rgba(255, 193, 7, 0.95);
  color: #000;
  padding: 0.5rem 1rem;
  border-radius: 20px;
  font-size: 0.9rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.quality-icon {
  font-size: 1rem;
}

.quality-text {
  flex: 1;
  font-weight: 500;
}

.quality-close {
  background: none;
  border: none;
  font-size: 1.2rem;
  cursor: pointer;
  color: #000;
  line-height: 1;
  padding: 0 0.25rem;
}

/* 摄像头未启动提示 */
.camera-placeholder {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
  color: #fff;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
}

.placeholder-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
}

.placeholder-text {
  font-size: 1.2rem;
  margin: 0 0 0.5rem 0;
  font-weight: 500;
}

.placeholder-hint {
  font-size: 0.9rem;
  margin: 0;
  opacity: 0.8;
}

/* 扫描中提示 */
.scanning-hint {
  position: absolute;
  bottom: 2rem;
  left: 50%;
  transform: translateX(-50%);
  background-color: rgba(0, 0, 0, 0.6);
  color: #fff;
  padding: 0.5rem 1rem;
  border-radius: 20px;
  font-size: 0.9rem;
  text-align: center;
  backdrop-filter: blur(5px);
  z-index: 10;
}

.quality-warning {
  margin: 0.25rem 0 0 0;
  font-size: 0.8rem;
  color: #FF9800;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.6;
  }
}

.top-left {
  top: -3px;
  left: -3px;
  border-right: none;
  border-bottom: none;
  border-top-left-radius: 4px;
}

.top-right {
  top: -3px;
  right: -3px;
  border-left: none;
  border-bottom: none;
  border-top-right-radius: 4px;
}

.bottom-left {
  bottom: -3px;
  left: -3px;
  border-right: none;
  border-top: none;
  border-bottom-left-radius: 4px;
}

.bottom-right {
  bottom: -3px;
  right: -3px;
  border-left: none;
  border-top: none;
  border-bottom-right-radius: 4px;
}

/* 切换提示 */
.switching-hint {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background-color: rgba(0, 0, 0, 0.8);
  color: #fff;
  padding: 1rem 2rem;
  border-radius: 8px;
  font-size: 1rem;
  z-index: 100;
  animation: fade-in-out 1.5s ease;
}

@keyframes fade-in-out {
  0% { opacity: 0; }
  20% { opacity: 1; }
  80% { opacity: 1; }
  100% { opacity: 0; }
}

/* 控制按钮容器 */
.camera-controls-container {
  width: 100%;
  max-width: 400px;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

/* 控制按钮 */
.camera-controls {
  display: flex;
  gap: 0.75rem;
  justify-content: center;
  width: 100%;
  flex-wrap: wrap;
}

.control-btn {
  flex: 1;
  min-width: 120px;
  padding: 0.75rem 1rem;
  border: none;
  border-radius: 8px;
  background-color: #4CAF50;
  color: white;
  font-size: 0.95rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  max-width: 200px;
}

.control-btn:hover {
  background-color: #45a049;
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

.control-btn:active {
  transform: translateY(0);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.control-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.control-btn:first-child {
  background-color: #2196F3;
}

.control-btn:first-child:hover {
  background-color: #0b7dda;
}

.control-btn:last-child {
  background-color: #FF9800;
}

.control-btn:last-child:hover {
  background-color: #e68a00;
}

/* 隐藏文件输入 */
.file-input {
  display: none;
}

/* 设置面板 */
.settings-panel {
  width: 100%;
  max-width: 400px;
}

.settings-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  width: 100%;
  padding: 0.5rem;
  background-color: #fff;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.settings-toggle:hover {
  background-color: #f5f5f5;
}

.settings-toggle svg {
  width: 20px;
  height: 20px;
  fill: #666;
}

.settings-toggle span {
  color: #666;
  font-size: 0.9rem;
  font-weight: 500;
}

.settings-content {
  background-color: #fff;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 1rem;
  margin-top: 0.5rem;
  animation: slide-down 0.2s ease;
}

@keyframes slide-down {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.setting-item {
  margin-bottom: 1rem;
}

.setting-item:last-child {
  margin-bottom: 0;
}

.setting-label {
  display: block;
  font-size: 0.85rem;
  font-weight: 500;
  color: #333;
  margin-bottom: 0.5rem;
}

.setting-select {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  font-size: 0.9rem;
  outline: none;
  transition: border-color 0.2s ease;
}

.setting-select:focus {
  border-color: #4CAF50;
}

/* 扫描提示 */
.scan-tips {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.tip-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.85rem;
  color: #666;
}

.tip-icon {
  font-size: 1rem;
}

.tip-text {
  flex: 1;
}

/* 质量指标 */
.quality-metrics {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.metric-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.metric-label {
  font-size: 0.8rem;
  color: #666;
  width: 3rem;
}

.metric-bar {
  flex: 1;
  height: 6px;
  background-color: #e0e0e0;
  border-radius: 3px;
  overflow: hidden;
}

.metric-fill {
  height: 100%;
  transition: width 0.3s ease, background-color 0.3s ease;
}

.metric-value {
  font-size: 0.8rem;
  color: #666;
  width: 2rem;
  text-align: right;
}

/* 输入区域 */
.input-section {
  padding: 1rem;
  background-color: #fff;
  border-top: 1px solid #e0e0e0;
}

.input-group {
  display: flex;
  gap: 0.75rem;
  max-width: 400px;
  margin: 0 auto;
}

.isbn-input {
  flex: 1;
  padding: 0.75rem 1rem;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 1rem;
  outline: none;
  transition: border-color 0.2s ease;
}

.isbn-input:focus {
  border-color: #4CAF50;
}

/* 按钮样式 */
.btn-primary {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 8px;
  background-color: #4CAF50;
  color: #fff;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.btn-primary:hover {
  background-color: #45a049;
}

.btn-outline {
  padding: 0.75rem 1.5rem;
  border: 1px solid #ddd;
  border-radius: 8px;
  background-color: #fff;
  color: #333;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-outline:hover {
  border-color: #4CAF50;
  color: #4CAF50;
}

/* 结果和错误区域 */
.result-section, .error-section {
  position: fixed;
  bottom: 0;
  left: 0;
  width: 100%;
  padding: 1rem;
  background-color: #fff;
  box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.1);
  animation: slide-up 0.3s ease;
  z-index: 30;
}

/* 已扫描列表区域 */
.scanned-list-section {
  background-color: #fff;
  border-top: 1px solid #e0e0e0;
  margin-top: 1rem;
  max-height: 40vh;
  display: flex;
  flex-direction: column;
}

.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid #e0e0e0;
  background-color: #f9f9f9;
}

.list-header h3 {
  margin: 0;
  font-size: 0.95rem;
  color: #333;
}

.list-actions {
  display: flex;
  gap: 0.5rem;
}

.action-btn {
  padding: 0.4rem 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  background-color: #fff;
  color: #333;
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.action-btn:hover:not(:disabled) {
  background-color: #f5f5f5;
  border-color: #4CAF50;
}

.action-btn.small {
  padding: 0.3rem 0.6rem;
  font-size: 0.75rem;
}

.action-btn.danger {
  color: #f44336;
  border-color: #f44336;
}

.action-btn.danger:hover:not(:disabled) {
  background-color: #ffebee;
}

.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.scanned-list {
  flex: 1;
  overflow-y: auto;
  padding: 0.5rem;
}

.scanned-item {
  display: flex;
  align-items: center;
  padding: 0.5rem 0.75rem;
  background-color: #f9f9f9;
  border-radius: 6px;
  margin-bottom: 0.5rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.scanned-item:hover {
  background-color: #f0f0f0;
}

.scanned-item.selected {
  background-color: #e3f2fd;
  border: 1px solid #2196F3;
}

.item-checkbox {
  margin-right: 0.5rem;
}

.item-checkbox input {
  width: 16px;
  height: 16px;
  cursor: pointer;
}

.item-index {
  font-size: 0.8rem;
  color: #999;
  width: 1.5rem;
  text-align: center;
  margin-right: 0.5rem;
}

.item-isbn {
  flex: 1;
  font-family: monospace;
  font-size: 0.9rem;
  color: #333;
}

.item-remove {
  width: 24px;
  height: 24px;
  border: none;
  background-color: transparent;
  color: #999;
  font-size: 1.2rem;
  cursor: pointer;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.item-remove:hover {
  background-color: #ffebee;
  color: #f44336;
}

.list-footer {
  display: flex;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  border-top: 1px solid #e0e0e0;
  background-color: #f9f9f9;
}

.clear-all-btn {
  flex: 1;
  padding: 0.6rem 1rem;
  border: 1px solid #ddd;
  border-radius: 6px;
  background-color: #fff;
  color: #666;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.clear-all-btn:hover {
  background-color: #ffebee;
  border-color: #f44336;
  color: #f44336;
}

.batch-search-btn {
  flex: 2;
  padding: 0.6rem 1rem;
  border: none;
  border-radius: 6px;
  background-color: #4CAF50;
  color: #fff;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.batch-search-btn:hover {
  background-color: #45a049;
}

.btn-secondary {
  padding: 0.75rem 1.5rem;
  border: 1px solid #2196F3;
  border-radius: 8px;
  background-color: #fff;
  color: #2196F3;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-secondary:hover {
  background-color: #e3f2fd;
}

@keyframes slide-up {
  from {
    transform: translateY(100%);
  }
  to {
    transform: translateY(0);
  }
}

.result-card, .error-card {
  max-width: 400px;
  margin: 0 auto;
  padding: 1.5rem;
  border-radius: 12px;
  text-align: center;
}

.result-card {
  background-color: #e8f5e9;
  border: 1px solid #c8e6c9;
}

.error-card {
  background-color: #ffebee;
  border: 1px solid #ffcdd2;
}

.result-header {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.result-icon {
  font-size: 1.5rem;
}

.result-header h2 {
  margin: 0;
  font-size: 1.2rem;
  color: #2e7d32;
}

.result-content {
  margin-bottom: 1.5rem;
}

.isbn-text {
  font-size: 1.1rem;
  font-weight: 500;
  margin: 0.5rem 0;
  color: #333;
}

.result-actions {
  display: flex;
  gap: 0.75rem;
  justify-content: center;
}

.error-icon {
  font-size: 2rem;
  margin-bottom: 1rem;
  color: #c62828;
}

.error-card h3 {
  margin: 0 0 0.5rem 0;
  color: #c62828;
}

.error-card p {
  margin: 0 0 1rem 0;
  color: #555;
}

/* 响应式设计 */
@media (max-width: 480px) {
  .camera-container {
    height: 50vh;
  }
  
  .camera-controls {
    flex-direction: column;
    gap: 0.5rem;
  }
  
  .settings-content {
    padding: 0.75rem;
  }
}
</style>
