<template>
  <div class="book-container">
    <!-- 顶部工具栏 -->
    <div class="toolbar">
      <div class="search-bar" @click="goToSearch">
        <svg class="search-icon" viewBox="0 0 24 24" fill="currentColor">
          <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
        </svg>
        <span>搜索书籍...</span>
      </div>
      <div class="toolbar-actions">
        <!-- 扫码按钮（带下拉菜单） -->
        <div class="dropdown-container" ref="scanDropdownRef">
          <button class="action-btn" @click="toggleScanMenu" title="扫码">
            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path fill="currentColor" d="M3 3v6h2V3H5c-1.1 0-2 .9-2 2zm2 10H3v4c0 1.1.9 2 2 2h4v-2H5v-4zm14 4h-4v2h4c1.1 0 2-.9 2-2v-4h-2v4zm0-16h-4v2h4v4h2V5c0-1.1-.9-2-2-2zm-7 13h2v-2h-2v2zm0 4h2v-2h-2v2zm-4-4h2v-2H8v2zm4-4h2v-2h-2v2zm-4 0h2v-2H8v2zm-2 2h2v-2H6v2zm4-4h2V9h-2v2zm4 0h2V9h-2v2zm-2 4h2v-2h-2v2zm0 4h2v-2h-2v2z"/>
            </svg>
          </button>
          <div v-if="showScanMenu" class="dropdown-menu">
            <div class="dropdown-item" @click="goToISBN">
              <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path fill="currentColor" d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 14l-8-5V6l8 5v7z"/>
              </svg>
              ISBN搜索
            </div>
            <div class="dropdown-item" @click="goToBatchScanner">
              <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path fill="currentColor" d="M21 5c-1.11-.14-2 .9-2 2v14c0 1.1.89 2 2 2H5c-1.1 0-2-.9-2-2V7c0-1.1.89-2 2-2h14zM9 4H7V2h2v2zm8 0h-2V2h2v2zM5 20h14V7H5v13z"/>
              </svg>
              批量扫描
            </div>
          </div>
        </div>

        <!-- 设置按钮（带下拉菜单） -->
        <div class="dropdown-container" ref="settingsDropdownRef">
          <button class="action-btn" @click="toggleSettingsMenu" title="设置">
            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path fill="currentColor" d="M19.14 12.94c.04-.31.06-.63.06-.94 0-.31-.02-.63-.06-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>
            </svg>
          </button>
          <div v-if="showSettingsMenu" class="dropdown-menu settings-menu">
            <div class="dropdown-item" @click="toggleLayout">
              <svg v-if="layout === 'grid'" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path fill="currentColor" d="M3 13h8v-2H3v2zm0 8h8v-2H3v2zm10-8h8v-2h-8v2zm0 8h8v-2h-8v2z"/>
              </svg>
              <svg v-else viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path fill="currentColor" d="M3 3h8v8H3V3zm10 0h8v8h-8V3zM3 13h8v8H3v-8zm10 0h8v8h-8v-8z"/>
              </svg>
              {{ layout === 'grid' ? '列表视图' : '网格视图' }}
            </div>
            <div class="menu-divider"></div>
            <div class="dropdown-item" @click="startOrganizeMode">
              <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path fill="currentColor" d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z"/>
              </svg>
              整理书籍
            </div>
            <div class="menu-divider"></div>
            <div class="dropdown-item-sub">
              <div class="menu-label">分组缩略图数</div>
              <div class="row-count-buttons">
                <button
                  :class="['row-btn', { active: groupThumbnailMax === 4 }]"
                  @click="appStore.setGroupThumbnailMax(4)"
                >
                  4本
                </button>
                <button
                  :class="['row-btn', { active: groupThumbnailMax === 9 }]"
                  @click="appStore.setGroupThumbnailMax(9)"
                >
                  9本
                </button>
              </div>
            </div>
            <div class="menu-divider"></div>
            <div class="dropdown-item-sub">
              <div class="menu-label">每行书籍数</div>
              <div class="row-count-buttons">
                <button
                  :class="['row-btn', { active: gridColumns === 'auto' }]"
                  @click="setGridColumns('auto')"
                >
                  自动
                </button>
                <button
                  :class="['row-btn', { active: gridColumns === '2' }]"
                  @click="setGridColumns('2')"
                >
                  2列
                </button>
                <button
                  :class="['row-btn', { active: gridColumns === '3' }]"
                  @click="setGridColumns('3')"
                >
                  3列
                </button>
                <button
                  :class="['row-btn', { active: gridColumns === '4' }]"
                  @click="setGridColumns('4')"
                >
                  4列
                </button>
                <button
                  :class="['row-btn', { active: gridColumns === '5' }]"
                  @click="setGridColumns('5')"
                >
                  5列
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- 手动录入按钮 -->
        <button class="action-btn add-btn" @click="goToAddBook" title="手动录入">
          <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
          </svg>
        </button>
      </div>
    </div>

    <!-- 高级筛选弹窗 -->
    <div v-if="showAdvancedFilter" class="filter-overlay" @click="showAdvancedFilter = false">
      <div class="filter-dialog" @click.stop>
        <div class="filter-header">
          <h3 class="filter-title">高级筛选</h3>
          <span class="filter-count">
            已筛选 {{ filteredBooks.length }} / {{ bookStore.allBooks.length }} 本
          </span>
          <span class="dialog-close" @click="showAdvancedFilter = false">×</span>
        </div>
        <div class="filter-body">
          <!-- 标签筛选 -->
          <div class="filter-section">
            <label class="filter-label">标签（多选）</label>
            <div class="tags-filter">
              <span
                v-for="tag in availableTags"
                :key="tag"
                :class="['filter-tag', { 'filter-tag--active': filterConditions.tags.includes(tag) }]"
                @click="toggleTagFilter(tag)"
              >
                {{ tag }}
              </span>
              <span v-if="availableTags.length === 0" class="no-tags">暂无标签</span>
            </div>
          </div>

          <!-- 阅读状态 -->
          <div class="filter-section">
            <label class="filter-label">阅读状态</label>
            <div class="filter-options">
              <button
                :class="['filter-option-btn', { 'filter-option-btn--active': filterConditions.readStatus === '' }]"
                @click="filterConditions.readStatus = ''; saveFilterConditions();"
              >
                全部
              </button>
              <button
                :class="['filter-option-btn', { 'filter-option-btn--active': filterConditions.readStatus === '未读' }]"
                @click="filterConditions.readStatus = '未读'; saveFilterConditions();"
              >
                未读
              </button>
              <button
                :class="['filter-option-btn', { 'filter-option-btn--active': filterConditions.readStatus === '在读' }]"
                @click="filterConditions.readStatus = '在读'; saveFilterConditions();"
              >
                在读
              </button>
              <button
                :class="['filter-option-btn', { 'filter-option-btn--active': filterConditions.readStatus === '已读' }]"
                @click="filterConditions.readStatus = '已读'; saveFilterConditions();"
              >
                已读
              </button>
            </div>
          </div>

          <!-- 书籍载体类型 -->
          <div class="filter-section">
            <label class="filter-label">书籍载体</label>
            <div class="filter-options">
              <button
                :class="['filter-option-btn', { 'filter-option-btn--active': filterConditions.binding1 === null }]"
                @click="filterConditions.binding1 = null; saveFilterConditions();"
              >
                全部
              </button>
              <button
                :class="['filter-option-btn', { 'filter-option-btn--active': filterConditions.binding1 === 0 }]"
                @click="filterConditions.binding1 = 0; saveFilterConditions();"
              >
                电子书
              </button>
              <button
                :class="['filter-option-btn', { 'filter-option-btn--active': filterConditions.binding1 === 1 }]"
                @click="filterConditions.binding1 = 1; saveFilterConditions();"
              >
                纸质书
              </button>
              <button
                :class="['filter-option-btn', { 'filter-option-btn--active': filterConditions.binding1 === 2 }]"
                @click="filterConditions.binding1 = 2; saveFilterConditions();"
              >
                有声书
              </button>
            </div>
          </div>

          <!-- 装帧类型 -->
          <div class="filter-section">
            <label class="filter-label">装帧类型</label>
            <select v-model="filterConditions.binding2" @change="saveFilterConditions()" class="filter-select">
              <option :value="null">全部</option>
              <option v-for="(name, value) in [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]" :key="value" :value="value">
                {{ getBinding2Name(value) }}
              </option>
            </select>
          </div>

          <!-- 出版社 -->
          <div class="filter-section">
            <label class="filter-label">出版社（模糊搜索）</label>
            <div class="filter-search">
              <svg class="search-icon-small" viewBox="0 0 24 24">
                <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
              </svg>
              <input
                v-model="filterConditions.publisher"
                @input="saveFilterConditions()"
                class="filter-input"
                placeholder="输入出版社名称..."
              />
              <button v-if="filterConditions.publisher" class="clear-input-btn" @click="filterConditions.publisher = ''; saveFilterConditions();">×</button>
            </div>
          </div>

          <!-- 作者 -->
          <div class="filter-section">
            <label class="filter-label">作者（模糊搜索）</label>
            <div class="filter-search">
              <svg class="search-icon-small" viewBox="0 0 24 24">
                <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
              </svg>
              <input
                v-model="filterConditions.author"
                @input="saveFilterConditions()"
                class="filter-input"
                placeholder="输入作者名称..."
              />
              <button v-if="filterConditions.author" class="clear-input-btn" @click="filterConditions.author = ''; saveFilterConditions();">×</button>
            </div>
          </div>
        </div>

        <div class="filter-footer">
          <button class="btn btn-default" @click="clearFilterConditions">
            清除所有筛选
          </button>
          <button class="btn btn-primary" @click="showAdvancedFilter = false">
            应用
          </button>
        </div>
      </div>
    </div>

    <!-- Tab切换 -->
    <div class="tabs">
      <div 
        v-for="tab in tabs" 
        :key="tab.key"
        :class="['tab-item', { active: activeTab === tab.key }]"
        @click="activeTab = tab.key"
      >
        {{ tab.label }}
        <span v-if="tab.count !== undefined" class="tab-count">{{ tab.count }}</span>
      </div>
    </div>

    <!-- 筛选栏 -->
    <div class="filter-bar">
      <button
        :class="['filter-btn', { 'filter-btn--active': hasActiveFilters }]"
        @click="toggleAdvancedFilter"
      >
        <svg class="filter-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path fill="currentColor" d="M3 17v2h6v-2H3zM3 5v2h6V5H3zm10 0h-6v2h6v-2zm0 8h-6v2h6V5zm0 6h-6v2h6V9zm0 8h-6v2h6v-2zm2 0v2h6v-2h-6v2h6V5zm8 0h-6v2h6V5zm0 6h-6v2h6V9zm0 8h-6v2h6v-2zm2 0v2h6v-2h-6v2h6v-2z"/>
        </svg>
        筛选
        <span v-if="hasActiveFilters" class="filter-badge">{{ filteredBooks.length }}</span>
      </button>
      <select v-model="sortBy" class="filter-select">
        <option value="updateTime">更新时间</option>
        <option value="createTime">添加时间</option>
        <option value="title">书名</option>
        <option value="author">作者</option>
        <option value="rating">评分</option>
      </select>
    </div>

    <!-- 整理模式遮罩层 -->
    <div v-if="isOrganizeMode" class="organize-mode-overlay">
      <!-- 顶部操作栏 -->
      <div class="organize-top-bar">
        <div class="organize-top-left">
          <button class="organize-action-btn" @click="selectAllBooks">
            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path fill="currentColor" d="M18 7H6c-1.1 0-2 .9-2 2v6c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V9c0-1.1-.9-2-2-2zm-9 9H6v-2h3v2zm0-3H6v-2h3v2zm0-3H6V8h3v2zm7 6h-5v-2h5v2zm0-3h-5v-2h5v2zm0-3h-5V8h5v2z"/>
            </svg>
            全选书籍
          </button>
          <button class="organize-action-btn" @click="selectAllGroups">
            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path fill="currentColor" d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 1.99 2H16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/>
            </svg>
            全选分组
          </button>
          <button class="organize-action-btn" @click="invertSelection">
            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/>
            </svg>
            反选
          </button>
        </div>
        <div class="organize-top-right">
          <span class="selected-count">已选 {{ selectedGroupIds.length }} 个分组、{{ selectedBookIds.length }} 本书</span>
        </div>
      </div>

      <!-- 底部功能栏 -->
      <div class="organize-bottom-bar">
        <button class="organize-tool-btn" @click="scrollToTop" title="回顶部">
          <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path fill="currentColor" d="M4 12l1.41 1.41L11 7.83V20h2V7.83l5.58 5.59L20 12l-8-8-8 8z"/>
          </svg>
        </button>
        <button class="organize-tool-btn" @click="pinToTop" title="置顶">
          <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path fill="currentColor" d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
          </svg>
        </button>
        <button class="organize-tool-btn" @click="moveToStart" title="移到开头">
          <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path fill="currentColor" d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
          </svg>
        </button>
        <button class="organize-tool-btn" @click="moveToEnd" title="移到末尾">
          <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path fill="currentColor" d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z"/>
          </svg>
        </button>
        <button class="organize-tool-btn" @click="moveToGroup" title="移至分组">
          <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path fill="currentColor" d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/>
          </svg>
        </button>
        <button class="organize-tool-btn" @click="addToWishlistBatch" title="添加到书单">
          <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path fill="currentColor" d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2zm0 15l-5-2.18L7 18V5h10v13z"/>
          </svg>
        </button>
        <button class="organize-tool-btn" @click="addTags" title="添加标签">
          <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path fill="currentColor" d="M21.41 11.58l-9-9C12.05 2.22 11.55 2 11 2s-1.05.22-1.41.59L2.59 10.59c-.78.77-.78 2.04 0 2.83L8 18.83c.39.39.9.59 1.41.59.51 0 1.02-.2 1.41-.59l7-7c.78-.78.78-2.05 0-2.83l-6.41-6.42zM6.41 10L12 4.41 15.59 8 10 13.59 6.41 10zM15 17l-5-5 1.41-1.41 5 5L15 17z"/>
          </svg>
        </button>
        <button class="organize-tool-btn" @click="changeStatus" title="修改状态">
          <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path fill="currentColor" d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-9 14l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
          </svg>
        </button>
        <button class="organize-tool-btn" @click="setSource" title="设置来源">
          <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
          </svg>
        </button>
        <button class="organize-tool-btn" @click="exportBookDraft" title="导出书稿">
          <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path fill="currentColor" d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
          </svg>
        </button>
        <button class="organize-tool-btn" @click="exportBooks" title="导出书籍">
          <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path fill="currentColor" d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
          </svg>
        </button>
        <button class="organize-tool-btn organize-btn-delete" @click="deleteSelected" title="删除">
          <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path fill="currentColor" d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
          </svg>
        </button>
        <button class="organize-tool-btn organize-btn-exit" @click="exitOrganizeMode" title="退出">
          <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
          </svg>
        </button>
      </div>
    </div>

    <!-- 内容区域 -->
    <div class="content">
      <!-- 书库页面 -->
      <div v-if="activeTab === 'library'" class="tab-content">
        <!-- 分组区域 -->
        <div v-if="sortedGroups.length > 0" class="groups-section">
          <h3 v-if="!isOrganizeMode" class="section-title">分组</h3>
          <div :class="['groups-grid', `grid-cols-${gridColumns}`, { 'groups-grid--organize': isOrganizeMode }]">
            <BookGroupCard
              v-for="group in sortedGroups"
              :key="group.id"
              :group="group"
              :books="groupBooks(group.id)"
              :max-thumbnails="groupThumbnailMax"
              :selected="selectedGroupIds.includes(group.id)"
              :is-organize-mode="isOrganizeMode"
              @click="isOrganizeMode ? toggleGroupSelection(group.id) : handleGroupClick(group.id)"
            />
          </div>
        </div>

        <!-- 书籍区域 -->
        <div class="books-section">
          <!-- 面包屑导航 -->
          <div v-if="currentGroupId" class="breadcrumb-nav">
            <span class="breadcrumb-item" @click="backToAllBooks">全部书籍</span>
            <span class="breadcrumb-separator">/</span>
            <span class="breadcrumb-item breadcrumb-item--current">
              {{ currentGroup?.name }}
            </span>
          </div>
          <h3 v-else-if="!isOrganizeMode && sortedGroups.length > 0" class="section-title">全部书籍</h3>
          
          <!-- 加载状态 -->
          <div v-if="isLoading" class="loading-state">
            <div class="loading-spinner"></div>
            <p>加载中...</p>
          </div>
          
          <div v-else-if="filteredBooks.length > 0" :class="['book-grid', `book-grid--${layout}`, layout === 'grid' ? `grid-cols-${gridColumns}` : '']">
          <div
            v-for="book in filteredBooks"
            :key="book.id"
            :class="['book-card', `book-card--${layout}`, { 'book-card--selected': selectedBookIds.includes(book.id), 'book-card--organize': isOrganizeMode }]"
            @click="isOrganizeMode ? toggleBookSelection(book.id) : goToBookDetail(book.id)"
            :title="book.title"
          >
            <!-- 整理模式下的选择复选框 -->
            <div v-if="isOrganizeMode" class="book-select-checkbox">
              <svg v-if="selectedBookIds.includes(book.id)" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path fill="currentColor" d="M18 7H6c-1.1 0-2 .9-2 2v6c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V9c0-1.1-.9-2-2-2zm-9 9H6v-2h3v2zm0-3H6v-2h3v2zm0-3H6V8h3v2zm7 6h-5v-2h5v2zm0-3h-5v-2h5v2zm0-3h-5V8h5v2z"/>
              </svg>
              <svg v-else viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path fill="currentColor" d="M19 5v14H5V5h14m0-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z"/>
              </svg>
            </div>
            <div class="book-cover">
              <img v-if="book.coverUrl" :src="book.coverUrl" :alt="book.title" loading="lazy" @error="handleImgError" />
              <div v-else class="cover-placeholder">
                <span>{{ book.title ? book.title.charAt(0) : '?' }}</span>
              </div>
              <div v-if="readingStore.progressDisplayMode === 'label'" :class="['read-status', `read-status--${book.readStatus}`]">{{ book.readStatus }}</div>
            </div>
            <div class="book-info">
              <h3 class="book-title">{{ book.title || '未知书名' }}</h3>
              <p class="book-author">{{ book.author || '未知作者' }}</p>
              <ReadingProgressBarList v-if="readingStore.progressDisplayMode === 'progress' && book.read_pages && book.pages" :book="book" :show-duration="true" />
              <div v-if="book.rating" class="book-rating">
                <span class="rating-stars">{{ '★'.repeat(Math.max(0, Math.min(5, Math.floor(book.rating)))) }}{{ '☆'.repeat(Math.max(0, 5 - Math.max(0, Math.min(5, Math.floor(book.rating))))) }}</span>
                <span class="rating-value">{{ book.rating.toFixed(1) }}</span>
              </div>
            </div>
            <div v-if="!isOrganizeMode" class="book-actions">
              <button class="action-btn-sm" @click.stop="handleEdit(book.id)" title="编辑">
                <svg viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
              </button>
              <button class="action-btn-sm" @click.stop="handleDelete(book.id)" title="删除">
                <svg viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
              </button>
            </div>
          </div>
        </div>
        <div v-else class="empty-state">
          <span class="empty-icon">📚</span>
          <p>暂无书籍</p>
          <button class="btn-primary" @click="goToAddBook">添加第一本书</button>
        </div>
        </div>
      </div>

      <!-- 书单页面 -->
      <div v-if="activeTab === 'wishlist'" class="tab-content">
        <div class="wishlist-header">
          <h3>待购买书单</h3>
          <button class="btn-text" @click="showAddWishlist = true">+ 添加</button>
        </div>
        <div v-if="wishlist.length > 0" class="wishlist">
          <div v-for="item in wishlist" :key="item.id" class="wishlist-item">
            <span class="wishlist-title">{{ item.title }}</span>
            <span class="wishlist-author">{{ item.author }}</span>
            <button class="btn-text" @click="removeFromWishlist(item.isbn)">移除</button>
          </div>
        </div>
        <div v-else class="empty-state">
          <span class="empty-icon">📝</span>
          <p>待购买书单为空</p>
        </div>
      </div>
    </div>

    <!-- 分组选择弹窗 -->
    <div v-if="showGroupSelector" class="dialog-overlay" @click="showGroupSelector = false">
      <div class="dialog dialog-group-selector" @click.stop>
        <div class="dialog-header">
          <span>选择分组</span>
          <span class="dialog-close" @click="showGroupSelector = false">×</span>
        </div>
        <div class="dialog-body dialog-body--group-selector">
          <div class="group-selector-list">
            <div
              v-for="group in groups"
              :key="group.id"
              :class="['group-selector-item', { 'group-selector-item--selected': selectedGroupId === group.id }]"
              @click="selectedGroupId = group.id"
            >
              <div class="group-item-content">
                <span class="folder-icon">📁</span>
                <div class="group-item-details">
                  <span class="group-name-text">{{ group.name }}</span>
                  <span class="group-count-text">{{ group.bookCount }} 本</span>
                </div>
                <div v-if="selectedGroupId === group.id" class="check-icon">✓</div>
              </div>
            </div>
            <div class="group-selector-item group-selector-item--create" @click="showGroupSelector = false; showAddGroup = true;">
              <div class="group-item-content">
                <span class="folder-icon folder-icon--create">+</span>
                <div class="group-item-details">
                  <span class="group-name-text">创建新分组</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="dialog-footer">
          <button class="btn btn-default" @click="showGroupSelector = false">取消</button>
          <button class="btn btn-primary" @click="handleGroupConfirm(selectedGroupId)" :disabled="!selectedGroupId">确定</button>
        </div>
      </div>
    </div>

    <!-- 添加分组弹窗 -->
    <div v-if="showAddGroup" class="dialog-overlay" @click="showAddGroup = false">
      <div class="dialog" @click.stop>
        <div class="dialog-header">
          <span>{{ editingGroup ? '编辑分组' : '新建分组' }}</span>
          <span class="dialog-close" @click="showAddGroup = false">×</span>
        </div>
        <div class="dialog-body">
          <input 
            v-model="groupName" 
            class="input"
            placeholder="请输入分组名称"
          />
        </div>
        <div class="dialog-footer">
          <button class="btn btn-default" @click="showAddGroup = false">取消</button>
          <button class="btn btn-primary" @click="saveGroup">确定</button>
        </div>
      </div>
    </div>

    <!-- 删除确认弹窗 -->
    <div v-if="showDeleteConfirm" class="dialog-overlay" @click="showDeleteConfirm = false">
      <div class="dialog" @click.stop>
        <div class="dialog-header">
          <span>确认删除</span>
          <span class="dialog-close" @click="showDeleteConfirm = false">×</span>
        </div>
        <div class="dialog-body">
          <p style="margin-bottom: 16px;">确定要删除这本书吗？</p>
          <p style="font-size:12px; color:#999999; margin:0; padding:0;">删除将会联级删除对应的全部数据，无法恢复。</p>
        </div>
        <div class="dialog-footer">
          <button class="btn btn-default" @click="showDeleteConfirm = false">取消</button>
          <button class="btn btn-danger" @click="confirmDelete">删除</button>
        </div>
      </div>
    </div>

    <!-- 状态选择弹窗 -->
    <div v-if="showStatusSelector" class="dialog-overlay" @click="showStatusSelector = false">
      <div class="dialog" @click.stop>
        <div class="dialog-header">
          <span>设置阅读状态</span>
          <span class="dialog-close" @click="showStatusSelector = false">×</span>
        </div>
        <div class="dialog-body">
          <p>已选择 {{ selectedBookIds.length }} 本书</p>
          <div class="status-selector">
            <button
              :class="['status-btn', { active: newStatus === '未读' }]"
              @click="newStatus = '未读'"
            >
              <span class="status-dot status-dot--未读"></span>
              未读
            </button>
            <button
              :class="['status-btn', { active: newStatus === '在读' }]"
              @click="newStatus = '在读'"
            >
              <span class="status-dot status-dot--在读"></span>
              在读
            </button>
            <button
              :class="['status-btn', { active: newStatus === '已读' }]"
              @click="newStatus = '已读'"
            >
              <span class="status-dot status-dot--已读"></span>
              已读
            </button>
          </div>
        </div>
        <div class="dialog-footer">
          <button class="btn btn-default" @click="showStatusSelector = false">取消</button>
          <button class="btn btn-primary" @click="confirmChangeStatus">确定</button>
        </div>
      </div>
    </div>

    <!-- 配置提示弹窗 -->
    <div v-if="showConfigModal" class="dialog-overlay" @click="closeConfigModal">
      <div class="dialog dialog--config" @click.stop>
        <div class="dialog-header">
          <span>配置提示</span>
          <span class="dialog-close" @click="closeConfigModal">×</span>
        </div>
        <div class="dialog-body">
          <div class="config-modal-content">
            <div class="config-modal-icon">⚠️</div>
            <p class="config-modal-message">{{ configErrorMsg }}</p>
          </div>
        </div>
        <div class="dialog-footer">
          <button class="btn btn-primary" @click="goToConfig">去配置</button>
        </div>
      </div>
    </div>
  </div>


</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, onUnmounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { storeToRefs } from 'pinia';
import { useBookStore } from '@/store/book';
import { useAppStore } from '@/store/app';
import { useReaderStore } from '@/store/reader';
import { useReadingStore } from '@/store/reading';
import { bookService } from '@/services/book';
import { wishlistService } from '@/services/wishlistService';
import type { Book, BookGroup } from '@/services/book/types';
import type { WishlistItem } from '@/services/wishlistService';
import BookGroupCard from '@/components/business/BookGroupCard/BookGroupCard.vue';
import ReadingProgressBarList from '@/components/ReadingProgressBarList/ReadingProgressBarList.vue';

const router = useRouter();
const route = useRoute();
const bookStore = useBookStore();
const appStore = useAppStore();
const readerStore = useReaderStore();
const readingStore = useReadingStore();
const { books: storeBooks } = storeToRefs(bookStore);

// 配置提示框状态
const showConfigModal = ref(false);
const configErrorMsg = ref('');
const isLoading = ref(true);

// 检测数据库状态
const checkDatabaseStatus = async () => {
  try {
    const response = await fetch('/api/config/check-databases');
    const result = await response.json();
    
    if (result.success) {
      const { calibre, talebook } = result.data;
      // 检查是否至少有一个数据库有效
      if (!calibre.valid && !talebook.valid) {
        // 如果两个数据库都无效，显示配置提示框
        configErrorMsg.value = '请先配置至少一个书库';
        showConfigModal.value = true;
      }
    }
  } catch (error) {
    console.error('检测数据库状态失败:', error);
    // 检测失败时显示配置提示框
    configErrorMsg.value = '数据库连接失败，请检查配置';
    showConfigModal.value = true;
  }
};

// 跳转到配置页面
const goToConfig = () => {
  showConfigModal.value = false;
  router.push('/config');
};

// 关闭配置提示框
const closeConfigModal = () => {
  showConfigModal.value = false;
};

// Tab配置
const tabs = computed(() => [
  { key: 'library', label: '书库', count: bookStore.allBooks.length },
  { key: 'wishlist', label: '书单' }
]);
const activeTab = ref('library');

// 布局和筛选
const layout = ref<'grid' | 'list'>('grid');
const filterStatus = ref('');
const sortBy = ref('createTime');

// 高级筛选
const showAdvancedFilter = ref(false);

// 筛选条件
const filterConditions = ref({
  tags: [] as string[],
  readStatus: '' as '未读' | '在读' | '已读' | '',
  binding1: null as number | null, // 书籍载体类型: 0=电子书, 1=平装, 2=精装, 3=线装
  binding2: null as number | null, // 装帧类型
  publisher: '' as string,
  author: '' as string
});

// 可用的标签列表
const availableTags = computed(() => {
  const tagSet = new Set<string>();
  bookStore.allBooks.forEach(book => {
    if (book.tags && Array.isArray(book.tags)) {
      book.tags.forEach(tag => tagSet.add(tag));
    }
  });
  return Array.from(tagSet).sort();
});

// 可用的出版社列表
const availablePublishers = computed(() => {
  const publisherSet = new Set<string>();
  bookStore.allBooks.forEach(book => {
    if (book.publisher) {
      publisherSet.add(book.publisher);
    }
  });
  return Array.from(publisherSet).sort();
});

// 可用的作者列表
const availableAuthors = computed(() => {
  const authorSet = new Set<string>();
  bookStore.allBooks.forEach(book => {
    if (book.author) {
      authorSet.add(book.author);
    }
  });
  return Array.from(authorSet).sort();
});

// 分组相关
const currentGroupId = ref('');
const groupThumbnailMax = computed(() => appStore.groupThumbnailMax); // 从应用设置中获取分组缩略图最大数量

// 下拉菜单状态
const showScanMenu = ref(false);
const showSettingsMenu = ref(false);
const scanDropdownRef = ref<HTMLElement | null>(null);
const settingsDropdownRef = ref<HTMLElement | null>(null);

// 网格列数配置
const gridColumns = ref<'auto' | '2' | '3' | '4' | '5'>('auto');

// 点击外部关闭菜单的处理函数
const handleClickOutside = (event: MouseEvent) => {
  const target = event.target as Node;

  // 只有在菜单打开时才检查
  if (showScanMenu.value && scanDropdownRef.value) {
    if (!scanDropdownRef.value.contains(target)) {
      showScanMenu.value = false;
    }
  }

  if (showSettingsMenu.value && settingsDropdownRef.value) {
    if (!settingsDropdownRef.value.contains(target)) {
      showSettingsMenu.value = false;
    }
  }
};

// 分组数据
const groups = ref<BookGroup[]>([]);
const showAddGroup = ref(false);
const showGroupSelector = ref(false);
const selectedGroupId = ref('');
const groupName = ref('');
const editingGroup = ref<BookGroup | null>(null);

// 书单数据
const wishlist = ref<WishlistItem[]>([]);
const showAddWishlist = ref(false);

// 删除确认
const showDeleteConfirm = ref(false);
const deletingBookId = ref<number>(0);

// 整理模式
const isOrganizeMode = ref(false);
const selectedBookIds = ref<number[]>([]);
const selectedGroupIds = ref<string[]>([]);

// 状态选择弹窗
const showStatusSelector = ref(false);
const newStatus = ref<'未读' | '在读' | '已读'>('未读');

// 筛选后的书籍列表
const filteredBooks = computed(() => {
  let books = [...bookStore.allBooks];

  // 如果当前在查看某个分组，只显示该分组的书籍
  if (currentGroupId.value) {
    books = books.filter(b => b.groups && b.groups.includes(currentGroupId.value));
  }

  // 状态筛选（优先使用高级筛选的状态）
  const statusFilter = filterConditions.value.readStatus || filterStatus.value;
  if (statusFilter) {
    books = books.filter(b => b.readStatus === statusFilter);
  }

  // 标签筛选（多选）
  if (filterConditions.value.tags.length > 0) {
    books = books.filter(b => {
      if (!b.tags || !Array.isArray(b.tags)) return false;
      return filterConditions.value.tags.some(tag => b.tags.includes(tag));
    });
  }

  // 书籍载体类型筛选
  if (filterConditions.value.binding1 !== null) {
    books = books.filter(b => b.binding1 === filterConditions.value.binding1);
  }

  // 装帧类型筛选
  if (filterConditions.value.binding2 !== null) {
    books = books.filter(b => b.binding2 === filterConditions.value.binding2);
  }

  // 出版社模糊搜索
  if (filterConditions.value.publisher.trim()) {
    const publisherQuery = filterConditions.value.publisher.toLowerCase().trim();
    books = books.filter(b =>
      b.publisher && b.publisher.toLowerCase().includes(publisherQuery)
    );
  }

  // 作者模糊搜索
  if (filterConditions.value.author.trim()) {
    const authorQuery = filterConditions.value.author.toLowerCase().trim();
    books = books.filter(b =>
      b.author && b.author.toLowerCase().includes(authorQuery)
    );
  }

  // 排序
  books.sort((a, b) => {
    switch (sortBy.value) {
      case 'title':
        return (a.title || '').localeCompare(b.title || '');
      case 'author':
        return (a.author || '').localeCompare(b.author || '');
      case 'rating':
        return (b.rating || 0) - (a.rating || 0);
      case 'updateTime':
        return new Date(b.updateTime || 0).getTime() - new Date(a.updateTime || 0).getTime();
      default: // createTime
        return new Date(b.createTime || 0).getTime() - new Date(a.createTime || 0).getTime();
    }
  });

  return books;
});

// 排序后的分组
const sortedGroups = computed(() => {
  return [...groups.value].sort((a, b) => a.sort - b.sort);
});

// 优化：使用 computed 缓存分组书籍映射，避免每次渲染都遍历所有书籍
const groupBooksMap = computed(() => {
  const map = new Map<string, Book[]>();
  groups.value.forEach(group => {
    map.set(group.id, bookStore.allBooks.filter(book => book.groups && book.groups.includes(group.id)));
  });
  return map;
});

// 获取分组中的书籍（使用缓存的映射）
const groupBooks = (groupId: string): Book[] => {
  return groupBooksMap.value.get(groupId) || [];
};

// 当前分组
const currentGroup = computed(() => {
  if (!currentGroupId.value) return null;
  return groups.value.find(g => g.id === currentGroupId.value);
});

// 切换布局
const toggleLayout = () => {
  layout.value = layout.value === 'grid' ? 'list' : 'grid';
  bookStore.setLayout(layout.value);
  showSettingsMenu.value = false;
};

// 切换扫码菜单
const toggleScanMenu = () => {
  showScanMenu.value = !showScanMenu.value;
  showSettingsMenu.value = false;
};

// 切换设置菜单
const toggleSettingsMenu = () => {
  showSettingsMenu.value = !showSettingsMenu.value;
  showScanMenu.value = false;
};

// 高级筛选功能
const toggleAdvancedFilter = () => {
  showAdvancedFilter.value = !showAdvancedFilter.value;
  showSettingsMenu.value = false;
};

const toggleTagFilter = (tag: string) => {
  const index = filterConditions.value.tags.indexOf(tag);
  if (index === -1) {
    filterConditions.value.tags.push(tag);
  } else {
    filterConditions.value.tags.splice(index, 1);
  }
  saveFilterConditions();
};

const clearFilterConditions = () => {
  filterConditions.value = {
    tags: [],
    readStatus: '',
    binding1: null,
    binding2: null,
    publisher: '',
    author: ''
  };
  saveFilterConditions();
};

const hasActiveFilters = computed(() => {
  return (
    filterConditions.value.tags.length > 0 ||
    filterConditions.value.readStatus !== '' ||
    filterConditions.value.binding1 !== null ||
    filterConditions.value.binding2 !== null ||
    filterConditions.value.publisher.trim() !== '' ||
    filterConditions.value.author.trim() !== ''
  );
});

// 保存筛选条件到localStorage
const saveFilterConditions = () => {
  localStorage.setItem('bookFilterConditions', JSON.stringify(filterConditions.value));
};

// 从localStorage加载筛选条件
const loadFilterConditions = () => {
  const saved = localStorage.getItem('bookFilterConditions');
  if (saved) {
    try {
      const conditions = JSON.parse(saved);
      filterConditions.value = {
        tags: conditions.tags || [],
        readStatus: conditions.readStatus || '',
        binding1: conditions.binding1 || null,
        binding2: conditions.binding2 || null,
        publisher: conditions.publisher || '',
        author: conditions.author || ''
      };
      console.log('✅ 加载已保存的筛选条件:', filterConditions.value);
    } catch (error) {
      console.error('⚠️ 加载筛选条件失败:', error);
    }
  }
};

// 获取载体类型名称
const getBinding1Name = (value: number): string => {
  const map: Record<number, string> = {
    0: '电子书',
    1: '纸质书',
    2: '有声书',
    3: '其他'
  };
  return map[value] || '未知';
};

// 获取装帧类型名称
const getBinding2Name = (value: number): string => {
  const map: Record<number, string> = {
    0: '无装帧',
    1: '无线胶装',
    2: '骑马钉装订',
    3: '活页装订',
    4: '锁线胶装',
    5: '硬壳精装（圆脊）',
    6: '硬壳精装（方脊）',
    7: '布面精装',
    8: 'PU皮面精装',
    9: '真皮精装（头层牛皮）',
    10: '真皮精装（羊皮）',
    11: '仿皮（人造革）精装',
    12: '线装',
    13: '经折装'
  };
  return map[value] || '未知';
};

// 设置网格列数
const setGridColumns = (columns: 'auto' | '2' | '3' | '4' | '5') => {
  gridColumns.value = columns;
  // 保存到本地存储
  localStorage.setItem('bookGridColumns', columns);
  // 切换到网格视图（如果当前是列表视图）
  if (layout.value === 'list') {
    layout.value = 'grid';
    bookStore.setLayout('grid');
  }
};

// 加载网格列数配置
const loadGridColumns = () => {
  const saved = localStorage.getItem('bookGridColumns');
  if (saved) {
    gridColumns.value = saved as any;
  }
};

// 导航方法
const goToSearch = () => {
  router.push('/search');
};

const goToAddBook = () => {
  router.push('/book/edit');
};

const goToISBN = () => {
  showScanMenu.value = false;
  router.push('/book/isbn-search');
};

const goToBatchScanner = () => {
  showScanMenu.value = false;
  router.push('/book/batch-scanner');
};

const goToBookDetail = (id: string) => {
  router.push(`/book/detail/${id}`);
};

// 编辑书籍
const handleEdit = (id: number) => {
  router.push(`/book/edit/${id}`);
};

// 删除书籍
const handleDelete = (id: number) => {
  deletingBookId.value = id;
  showDeleteConfirm.value = true;
};

const confirmDelete = async () => {
  try {
    await bookService.deleteBook(deletingBookId.value);
    bookStore.deleteBook(deletingBookId.value);
    showDeleteConfirm.value = false;
  } catch (error) {
    console.error('删除失败:', error);
  }
};

// 分组管理
const handleGroupClick = (groupId: string) => {
  currentGroupId.value = groupId;
};

const editGroup = (group: BookGroup) => {
  editingGroup.value = group;
  groupName.value = group.name;
  showAddGroup.value = true;
};

const saveGroup = async () => {
  if (!groupName.value.trim()) return;
  
  try {
    if (editingGroup.value) {
      const updated = await bookService.updateGroup({
        ...editingGroup.value,
        name: groupName.value
      });
      const index = groups.value.findIndex(g => g.id === updated.id);
      if (index !== -1) groups.value[index] = updated;
    } else {
      const newGroup = await bookService.addGroup({
        name: groupName.value,
        sort: groups.value.length,
        parentId: null
      });
      groups.value.push(newGroup);
    }
    showAddGroup.value = false;
    groupName.value = '';
    editingGroup.value = null;
  } catch (error) {
    console.error('保存分组失败:', error);
  }
};

const deleteGroup = async (id: string) => {
  try {
    await bookService.deleteGroup(id);
    groups.value = groups.value.filter(g => g.id !== id);
  } catch (error) {
    console.error('删除分组失败:', error);
  }
};

// 返回全部书籍
const backToAllBooks = () => {
  currentGroupId.value = '';
};

// 整理模式下的分组功能
const moveToGroup = () => {
  showGroupSelector.value = true;
};

const handleGroupConfirm = async (groupId: string) => {
  if (!groupId || (selectedBookIds.value.length === 0 && selectedGroupIds.value.length === 0)) {
    return;
  }

  try {
    // 1. 处理选中的书籍：将书籍添加到目标分组
    for (const bookId of selectedBookIds.value) {
      const book = bookStore.getBookById(bookId);
      if (book) {
        // 如果书籍还没有这个分组，就添加
        if (!book.groups.includes(groupId)) {
          const updatedBook = {
            ...book,
            groups: [...book.groups, groupId],
            updateTime: new Date().toISOString()
          };
          await bookService.updateBook(updatedBook);
          bookStore.updateBook(updatedBook);
        }
      }
    }

    // 2. 处理选中的分组：将分组框中的所有书籍添加到目标分组
    for (const sourceGroupId of selectedGroupIds.value) {
      // 如果源分组和目标分组相同，跳过
      if (sourceGroupId === groupId) continue;

      const sourceGroupBooks = groupBooksMap.value.get(sourceGroupId) || [];
      for (const book of sourceGroupBooks) {
        // 如果书籍还没有目标分组，就添加
        if (!book.groups.includes(groupId)) {
          const updatedBook = {
            ...book,
            groups: [...book.groups, groupId],
            updateTime: new Date().toISOString()
          };
          await bookService.updateBook(updatedBook);
          bookStore.updateBook(updatedBook);
        }
      }
    }

    showGroupSelector.value = false;
    selectedGroupId.value = '';

    // 清除选中状态
    selectedBookIds.value = [];
    selectedGroupIds.value = [];

    // 重新加载分组数据以更新分组中的书籍数量
    const updatedGroups = await bookService.getAllGroups();
    groups.value = updatedGroups;
  } catch (error) {
    console.error('移动到分组失败:', error);
  }
};

// 书单管理
const removeFromWishlist = async (isbn: string) => {
  try {
    await wishlistService.removeFromWishlist(isbn);
    // 重新加载愿望清单
    await loadWishlist();
  } catch (error) {
    console.error('从愿望清单移除失败:', error);
    alert('移除失败，请重试');
  }
};

// 加载愿望清单
const loadWishlist = async () => {
  try {
    const readerId = readerStore.currentReaderId;
    const data = await wishlistService.getWishlist(readerId);
    wishlist.value = data;
  } catch (error) {
    console.error('加载愿望清单失败:', error);
    wishlist.value = [];
  }
};

// 添加到愿望清单
const addToWishlist = async (isbn: string, title: string, author?: string) => {
  try {
    await wishlistService.addToWishlist({
      isbn,
      title,
      author
    });
    // 重新加载愿望清单
    await loadWishlist();
  } catch (error) {
    console.error('添加到愿望清单失败:', error);
    alert('添加到愿望清单失败，请重试');
  }
};

// 图片加载错误处理
const handleImgError = async (event: Event) => {
  const imgElement = event.target as HTMLImageElement;
  console.error('图片加载失败:', {
    src: imgElement.src,
    alt: imgElement.alt,
    event: event,
    errorMessage: event instanceof Error ? event.message : 'Unknown error'
  });
  
  try {
    // 导入图片工具
    const { generatePlaceholderImage } = await import('@/utils/imageUtils');
    // 生成本地占位图片
    const placeholderUrl = await generatePlaceholderImage(120, 180);
    // 直接替换图片src为本地占位图片
    imgElement.src = placeholderUrl;
    imgElement.style.display = 'block';
    
    // 隐藏占位符元素（如果存在）
    const placeholderElement = imgElement.nextElementSibling as HTMLElement;
    if (placeholderElement && placeholderElement.classList.contains('cover-placeholder')) {
      placeholderElement.style.display = 'none';
    }
  } catch (error) {
    console.error('生成占位图片失败:', error);
    // 降级处理：隐藏错误图片，显示占位符
    imgElement.style.display = 'none';
    const placeholder = imgElement.nextElementSibling as HTMLElement;
    if (placeholder && placeholder.classList.contains('cover-placeholder')) {
      placeholder.style.display = 'flex';
    }
  }
};

// 加载数据
const loadData = async () => {
  isLoading.value = true;
  
  try {
    // 加载应用设置
    appStore.loadSettings();

    // 加载布局设置
    layout.value = bookStore.currentLayout;

    // 加载网格列数配置
    loadGridColumns();

    // 清空选中状态，避免切换数据库后删除不存在的书籍ID
    if (selectedBookIds.value.length > 0 || selectedGroupIds.value.length > 0) {
      console.log('🔄 清空选中状态...');
      selectedBookIds.value = [];
      selectedGroupIds.value = [];
    }

    // 定义加载书籍和分组的函数
    const loadBooks = async () => {
      // 加载书籍
      try {
        const books = await bookService.getAllBooks(readerStore.currentReaderId);
        bookStore.setBooks(books);
      } catch (error) {
        console.error('加载书籍失败:', error);
      }

      // 加载分组
      try {
        groups.value = await bookService.getAllGroups();
      } catch (error) {
        console.error('加载分组失败:', error);
      }
    };

    // 检测数据库状态
    await checkDatabaseStatus();
    
    // 加载书籍数据
    await loadBooks();

    // 加载书单
    try {
      await loadWishlist();
    } catch (error) {
      console.error('加载愿望清单失败:', error);
      wishlist.value = [];
    }
  } catch (error) {
    console.error('加载数据失败:', error);
  } finally {
    isLoading.value = false;
  }
};

onMounted(async () => {
  await loadData();

  // 加载筛选条件
  loadFilterConditions();

  // 加载阅读设置中的进度显示模式
  readingStore.loadProgressDisplayMode();

  // 处理路由参数
  if (route.query.status) {
    filterStatus.value = route.query.status as string;
  }

  // 添加点击外部关闭菜单的事件监听
  document.addEventListener('click', handleClickOutside);
});

onUnmounted(() => {
  // 移除点击外部关闭菜单的事件监听
  document.removeEventListener('click', handleClickOutside);
});

// 整理模式方法
const startOrganizeMode = () => {
  isOrganizeMode.value = true;
  showSettingsMenu.value = false;
  selectedBookIds.value = [];
  selectedGroupIds.value = [];
  // 添加 body 类以隐藏底部导航栏
  document.body.classList.add('organize-mode-active');
};

const exitOrganizeMode = () => {
  isOrganizeMode.value = false;
  selectedBookIds.value = [];
  selectedGroupIds.value = [];
  // 移除 body 类以显示底部导航栏
  document.body.classList.remove('organize-mode-active');
};

const toggleBookSelection = (bookId: number) => {
  const index = selectedBookIds.value.indexOf(bookId);
  if (index > -1) {
    selectedBookIds.value.splice(index, 1);
  } else {
    selectedBookIds.value.push(bookId);
  }
};

// 切换分组框的选中状态
const toggleGroupSelection = (groupId: string) => {
  const index = selectedGroupIds.value.indexOf(groupId);
  if (index > -1) {
    selectedGroupIds.value.splice(index, 1);
  } else {
    selectedGroupIds.value.push(groupId);
  }
};

const selectAllBooks = () => {
  selectedBookIds.value = filteredBooks.value.map(book => book.id);
};

const selectAllGroups = () => {
  selectedGroupIds.value = sortedGroups.value.map(group => group.id);
};

const invertSelection = () => {
  const allBookIds = filteredBooks.value.map(book => book.id);
  selectedBookIds.value = allBookIds.filter(id => !selectedBookIds.value.includes(id));

  const allGroupIds = sortedGroups.value.map(group => group.id);
  selectedGroupIds.value = allGroupIds.filter(id => !selectedGroupIds.value.includes(id));
};

const scrollToTop = () => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

const pinToTop = async () => {
  if (selectedBookIds.value.length === 0) {
    alert('请先选择书籍');
    return;
  }

  try {
    // 置顶：将所有选中书籍的 updateTime 设置为当前最新时间
    const now = new Date().toISOString();

    for (const bookId of selectedBookIds.value) {
      const book = bookStore.getBookById(bookId);
      if (book) {
        const updatedBook = {
          ...book,
          updateTime: now
        };
        const result = await bookService.updateBook(updatedBook);
        bookStore.updateBook(result);
      }
    }

    // 清除选中状态
    selectedBookIds.value = [];

    // 切换到按更新时间排序，以便看到置顶效果
    sortBy.value = 'updateTime';

    // 重新加载数据
    await loadData();
  } catch (error) {
    console.error('置顶失败:', error);
    alert('置顶失败，请重试');
  }
};

const moveToStart = async () => {
  if (selectedBookIds.value.length === 0) {
    alert('请先选择书籍');
    return;
  }

  try {
    // 移到开头：将选中的书籍按选中的顺序移到列表最前面
    // 通过调整所有书籍的 createTime 来实现排序

    const allBooks = bookStore.allBooks;
    const selectedBooks = selectedBookIds.value
      .map(id => bookStore.getBookById(id))
      .filter((book): book is Book => book !== undefined);
    const otherBooks = allBooks.filter(b => !selectedBookIds.value.includes(b.id));

    // 计算最早的时间作为基准
    const baseTime = new Date('2020-01-01').getTime();
    const now = Date.now();

    // 先更新未选中的书籍，给它们分配较早的时间
    for (let i = 0; i < otherBooks.length; i++) {
      const book = otherBooks[i];
      const updateTime = new Date(baseTime + i * 1000).toISOString();
      const updatedBook = {
        ...book,
        createTime: updateTime,
        updateTime: updateTime
      };
      await bookService.updateBook(updatedBook);
      bookStore.updateBook(updatedBook);
    }

    // 再更新选中的书籍，分配更新的时间（越靠前的时间越新）
    for (let i = 0; i < selectedBooks.length; i++) {
      const book = selectedBooks[i];
      const offset = selectedBooks.length - i;
      const updateTime = new Date(now + offset * 1000).toISOString();
      const updatedBook = {
        ...book,
        createTime: updateTime,
        updateTime: updateTime
      };
      await bookService.updateBook(updatedBook);
      bookStore.updateBook(updatedBook);
    }

    // 清除选中状态
    selectedBookIds.value = [];

    // 切换到按添加时间排序，以便看到移到开头的效果
    sortBy.value = 'createTime';

    // 重新加载数据
    await loadData();
  } catch (error) {
    console.error('移到开头失败:', error);
    alert('移到开头失败，请重试');
  }
};

const moveToEnd = async () => {
  if (selectedBookIds.value.length === 0) {
    alert('请先选择书籍');
    return;
  }

  try {
    // 移到末尾：将选中的书籍移到列表最后面
    // 通过调整所有书籍的 createTime 来实现排序

    const allBooks = bookStore.allBooks;
    const selectedBooks = selectedBookIds.value
      .map(id => bookStore.getBookById(id))
      .filter((book): book is Book => book !== undefined);
    const otherBooks = allBooks.filter(b => !selectedBookIds.value.includes(b.id));

    // 计算最早的时间作为基准
    const baseTime = new Date('2020-01-01').getTime();
    const now = Date.now();

    // 先更新未选中的书籍，分配更新的时间（它们会排在前面）
    for (let i = 0; i < otherBooks.length; i++) {
      const book = otherBooks[i];
      const updateTime = new Date(now + (otherBooks.length - i) * 1000).toISOString();
      const updatedBook = {
        ...book,
        createTime: updateTime,
        updateTime: updateTime
      };
      await bookService.updateBook(updatedBook);
      bookStore.updateBook(updatedBook);
    }

    // 再更新选中的书籍，分配较早的时间（它们会排在后面）
    for (let i = 0; i < selectedBooks.length; i++) {
      const book = selectedBooks[i];
      const updateTime = new Date(baseTime + i * 1000).toISOString();
      const updatedBook = {
        ...book,
        createTime: updateTime,
        updateTime: updateTime
      };
      await bookService.updateBook(updatedBook);
      bookStore.updateBook(updatedBook);
    }

    // 清除选中状态
    selectedBookIds.value = [];

    // 切换到按添加时间排序，以便看到移到末尾的效果
    sortBy.value = 'createTime';

    // 重新加载数据
    await loadData();
  } catch (error) {
    console.error('移到末尾失败:', error);
    alert('移到末尾失败，请重试');
  }
};

const addToWishlistBatch = () => {
  // TODO: 实现批量添加到书单功能
  console.log('批量添加到书单功能待实现');
};

const addTags = () => {
  // TODO: 实现添加标签功能
  console.log('添加标签功能待实现');
};

const changeStatus = () => {
  if (selectedBookIds.value.length === 0) {
    alert('请先选择书籍');
    return;
  }

  showStatusSelector.value = true;
};

const confirmChangeStatus = async () => {
  try {
    const now = new Date().toISOString();

    // 批量更新书籍阅读状态
    let successCount = 0;
    for (const bookId of selectedBookIds.value) {
      const book = bookStore.getBookById(bookId);

      if (book) {
        try {
          // 将字符串状态转换为数字
          const statusMap: Record<string, number> = {
            '未读': 0,
            '在读': 1,
            '已读': 2
          };
          const readStateNumber = statusMap[newStatus.value] || 0;

          // 调用专门的阅读状态更新API
          const readingStateData = {
            read_state: readStateNumber,
            read_date: newStatus.value === '已读' ? now : undefined
          };

          const updatedReadingState = await bookService.updateReadingState(
            bookId,
            readingStateData,
            readerStore.currentReaderId
          );

          // 更新本地书籍对象
          const updatedBook = {
            ...book,
            readStatus: newStatus.value,
            readCompleteDate: updatedReadingState.read_date || undefined,
            updateTime: now
          };

          // 使用后端返回的数据更新 store
          bookStore.updateBook(updatedBook);
          successCount++;
        } catch (error) {
          console.error(`更新书籍 ${bookId} 状态失败:`, error);
        }
      }
    }

    // 切换到按更新时间排序，以便看到状态更新后的效果
    sortBy.value = 'updateTime';

    // 重置状态筛选器，以便看到所有状态的书籍
    filterStatus.value = '';

    showStatusSelector.value = false;
    selectedBookIds.value = [];

    if (successCount > 0) {
      console.log(`✅ 成功更新 ${successCount} 本书的阅读状态`);
    } else {
      alert('修改状态失败，请重试');
    }
  } catch (error) {
    console.error('修改状态失败:', error);
    alert('修改状态失败，请重试');
  }
};

const setSource = () => {
  // TODO: 实现设置来源功能
  console.log('设置来源功能待实现');
};

const exportBookDraft = () => {
  // TODO: 实现导出书稿功能
  console.log('导出书稿功能待实现');
};

const exportBooks = () => {
  // TODO: 实现导出书籍功能
  console.log('导出书籍功能待实现');
};

const deleteSelected = async () => {
  if (selectedBookIds.value.length === 0 && selectedGroupIds.value.length === 0) return;

  const bookCount = selectedBookIds.value.length;
  const groupCount = selectedGroupIds.value.length;
  
  let confirmMessage = '';
  if (bookCount > 0 && groupCount > 0) {
    confirmMessage = `确定要删除选中的 ${bookCount} 本书和 ${groupCount} 个分组吗？`;
  } else if (bookCount > 0) {
    confirmMessage = `确定要删除选中的 ${bookCount} 本书吗？`;
  } else {
    confirmMessage = `确定要删除选中的 ${groupCount} 个分组吗？`;
  }

  if (confirm(confirmMessage)) {
    try {
      // 过滤出当前书籍列表中存在的书籍ID
      const validBookIds = selectedBookIds.value.filter(bookId =>
        bookStore.allBooks.some(book => book.id === bookId)
      );

      if (validBookIds.length < selectedBookIds.value.length) {
        const skippedCount = selectedBookIds.value.length - validBookIds.length;
        console.warn(`⚠️ 发现 ${skippedCount} 个书籍ID在当前数据库中不存在，已跳过`);
        alert(`注意：发现 ${skippedCount} 个书籍ID在当前数据库中不存在，已跳过这些书籍。\n\n这通常发生在切换数据库后，建议刷新页面重新加载书籍列表。`);
      }

      // 只删除存在的书籍
      let successCount = 0;
      let failCount = 0;

      for (const bookId of validBookIds) {
        try {
          await bookService.deleteBook(bookId);
          bookStore.deleteBook(bookId);
          successCount++;
        } catch (error) {
          console.error(`删除书籍 ${bookId} 失败:`, error);
          failCount++;
          // 继续删除其他书籍，不中断整个流程
        }
      }

      // 删除选中的分组
      for (const groupId of selectedGroupIds.value) {
        await bookService.deleteGroup(groupId);
        groups.value = groups.value.filter(g => g.id !== groupId);
      }

      // 如果在某个分组内，且该分组被删除，则返回全部书籍
      if (currentGroupId.value && selectedGroupIds.value.includes(currentGroupId.value)) {
        currentGroupId.value = '';
      }

      // 显示删除结果
      if (failCount > 0) {
        alert(`删除完成：成功删除 ${successCount} 本书，失败 ${failCount} 本。`);
      }

      exitOrganizeMode();
    } catch (error) {
      console.error('删除失败:', error);
      alert(`删除失败：${error.message}`);
      // 确保无论是否失败都退出整理模式
      exitOrganizeMode();
    }
  }
};

// 监听路由变化，当从编辑页面返回时重新加载数据
watch(
  () => route.path,
  (newPath, oldPath) => {
    // 当路由从其他页面返回到书库页面时，重新加载数据
    if (newPath === '/book' && oldPath && oldPath.startsWith('/book/')) {
      loadData();
    }
  }
);
</script>

<style scoped>
.book-container {
  min-height: 100vh;
  background-color: var(--bg-primary);
}

.toolbar {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  background-color: var(--bg-secondary);
  gap: 12px;
}

.search-bar {
  flex: 1;
  display: flex;
  align-items: center;
  padding: 8px 16px;
  background-color: #f5f5f5;
  border-radius: 20px;
  cursor: pointer;
}

.search-icon {
  width: 18px;
  height: 18px;
  fill: currentColor;
  margin-right: 8px;
  transition: all 0.2s ease;
}

.search-bar span {
  color: var(--text-hint);
  font-size: 14px;
}

.toolbar-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.action-btn {
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 50%;
  background-color: #f5f5f5;
  color: #555555;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  position: relative;
  flex-shrink: 0;
}

.action-btn svg {
  width: 18px;
  height: 18px;
  fill: currentColor;
  transition: all 0.2s ease;
  display: block;
  flex-shrink: 0;
}

.action-btn:hover {
  background-color: #e0e0e0;
  color: #333333;
  transform: scale(1.05);
}

.action-btn:active {
  transform: scale(0.95);
  background-color: #d0d0d0;
  color: #333333;
}

.add-btn:focus {
  outline: none;
  box-shadow: 0 0 0 3px rgba(255, 107, 53, 0.4);
}

/* 加载状态 */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  text-align: center;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #e0e0e0;
  border-top: 4px solid #333;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 16px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.loading-state p {
  color: #666;
  font-size: 16px;
}

/* 下拉菜单容器 */
.dropdown-container {
  position: relative;
}

/* 下拉菜单 */
.dropdown-menu {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  min-width: 160px;
  z-index: 100;
  padding: 4px 0;
}

/* 设置菜单更宽 */
.settings-menu {
  min-width: 220px;
}

/* 下拉菜单项 */
.dropdown-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 16px;
  cursor: pointer;
  transition: background-color 0.2s ease;
  font-size: 14px;
  color: var(--text-primary);
}

.dropdown-item:hover {
  background-color: #f5f5f5;
}

.dropdown-item:active {
  background-color: #e0e0e0;
}

.dropdown-item svg {
  width: 18px;
  height: 18px;
  fill: currentColor;
  transition: all 0.2s ease;
}

.dropdown-item:hover svg {
  fill: var(--primary-color, #FF6B35);
}

/* 菜单分割线 */
.menu-divider {
  height: 1px;
  background-color: var(--border-light);
  margin: 4px 0;
}

/* 下拉菜单子项 */
.dropdown-item-sub {
  padding: 10px 16px;
}

.menu-label {
  font-size: 12px;
  color: var(--text-hint);
  margin-bottom: 8px;
  font-weight: 500;
}

/* 行数按钮组 */
.row-count-buttons {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.row-btn {
  flex: 1;
  min-width: 50px;
  padding: 6px 10px;
  border: 1px solid var(--border-color);
  background-color: #fff;
  border-radius: 6px;
  font-size: 13px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.row-btn:hover {
  background-color: #f5f5f5;
  border-color: var(--text-secondary);
}

.row-btn:active {
  background-color: #e0e0e0;
  transform: scale(0.98);
}

.row-btn.active {
  background-color: var(--primary-color, #FF6B35);
  color: #fff;
  border-color: var(--primary-color, #FF6B35);
  font-weight: 500;
}

.row-btn.active:hover {
  background-color: #e65a2f;
  border-color: #e65a2f;
}

.add-btn {
  background-color: var(--primary-color, #FF6B35);
  color: #ffffff;
  box-shadow: 0 2px 6px rgba(255, 107, 53, 0.15);
}

.add-btn svg {
  fill: currentColor;
  stroke: none;
  transition: all 0.2s ease;
}

.add-btn:hover {
  background-color: #e65a2f;
  color: #ffffff;
  box-shadow: 0 4px 12px rgba(255, 107, 53, 0.25);
  transform: translateY(-1px);
}

.add-btn:active {
  background-color: #cc5629;
  color: #ffffff;
  box-shadow: 0 1px 4px rgba(255, 107, 53, 0.2);
  transform: translateY(0);
}

.tabs {
  display: flex;
  background-color: var(--bg-secondary);
  border-bottom: 1px solid var(--border-light);
  padding: 0 16px;
}

.tab-item {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 12px 16px;
  font-size: 14px;
  color: var(--text-secondary);
  cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: all 0.3s;
}

.tab-item.active {
  color: var(--primary-color);
  border-bottom-color: var(--primary-color);
  font-weight: 500;
}

.tab-count {
  font-size: 12px;
  padding: 2px 6px;
  background-color: #f0f0f0;
}

/* 配置提示弹窗样式 */
.dialog--config .dialog-body {
  text-align: center;
  padding: 24px;
}

.config-modal-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.config-modal-icon {
  font-size: 48px;
  animation: pulse 1.5s infinite;
}

.config-modal-message {
  font-size: 16px;
  color: var(--text-primary);
  line-height: 1.5;
  margin: 0;
  max-width: 400px;
}

@keyframes pulse {
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.1);
  }
  100% {
    transform: scale(1);
  }
}

.dialog--config .dialog-footer {
  justify-content: center;
  padding: 16px 24px 24px;
}

.dialog--config .btn-primary {
  min-width: 120px;
  font-size: 16px;
  border-radius: 10px;
}

.tab-item.active .tab-count {
  background-color: rgba(255, 107, 53, 0.1);
  color: var(--primary-color);
}

.filter-bar {
  display: flex;
  gap: 12px;
  padding: 12px 16px;
  background-color: var(--bg-secondary);
  border-bottom: 1px solid var(--border-light);
}

.filter-select {
  padding: 6px 12px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  background-color: #fff;
  font-size: 13px;
  color: var(--text-primary);
  outline: none;
}

.content {
  padding: 16px;
}

/* 书籍网格布局 */
.book-grid {
  display: grid;
  gap: 16px;
}

.book-grid--grid {
  /* 默认使用 auto 布局 */
}

.book-grid--grid.grid-cols-auto {
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
}

.book-grid--grid.grid-cols-2 {
  grid-template-columns: repeat(2, 1fr);
}

.book-grid--grid.grid-cols-3 {
  grid-template-columns: repeat(3, 1fr);
}

.book-grid--grid.grid-cols-4 {
  grid-template-columns: repeat(4, 1fr);
}

.book-grid--grid.grid-cols-5 {
  grid-template-columns: repeat(5, 1fr);
}

.book-grid--list {
  grid-template-columns: 1fr;
}

.book-card {
  background-color: var(--bg-card);
  border-radius: var(--radius-lg);
  overflow: hidden;
  cursor: pointer;
  transition: all 0.3s;
  position: relative;
}

.book-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.book-card--grid {
  display: flex;
  flex-direction: column;
}

.book-card--list {
  display: flex;
  align-items: center;
  padding: 12px;
}

.book-cover {
  position: relative;
  overflow: hidden;
}

.book-card--grid .book-cover {
  width: 100%;
  padding-top: 133.33%;
}

.book-card--list .book-cover {
  width: 60px;
  height: 80px;
  flex-shrink: 0;
  margin-right: 12px;
}

.book-cover img {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.book-card--list .book-cover img {
  position: static;
  border-radius: 4px;
}

.cover-placeholder {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  font-size: 36px;
  font-weight: 500;
}

.book-card--list .cover-placeholder {
  position: static;
  width: 60px;
  height: 80px;
  font-size: 24px;
  border-radius: 4px;
}

.read-status {
  position: absolute;
  top: 8px;
  right: 8px;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 10px;
  color: #fff;
}

.read-status--未读 { background-color: #9e9e9e; }
.read-status--在读 { background-color: var(--primary-color); }
.read-status--已读 { background-color: #4caf50; }

.book-info {
  padding: 12px;
  flex: 1;
}

.book-card--list .book-info {
  padding: 0;
}

.book-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
  margin: 0 0 4px 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.book-card--list .book-title {
  -webkit-line-clamp: 1;
}

.book-author {
  font-size: 12px;
  color: var(--text-hint);
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.book-rating {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 4px;
}

.rating-stars {
  color: #ffc107;
  font-size: 12px;
}

.rating-value {
  font-size: 12px;
  color: var(--text-hint);
}

.book-actions {
  position: absolute;
  top: 8px;
  right: 8px;
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.3s;
}

.book-card:hover .book-actions {
  opacity: 1;
}

.book-card--list .book-actions {
  position: static;
  opacity: 1;
  margin-left: auto;
}

.action-btn-sm {
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 50%;
  background-color: rgba(255, 255, 255, 0.9);
  color: #555555;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  flex-shrink: 0;
}

.action-btn-sm svg {
  width: 14px;
  height: 14px;
  fill: currentColor;
  transition: all 0.2s ease;
  display: block;
  flex-shrink: 0;
}

.action-btn-sm:hover {
  background-color: #fff;
  color: #333333;
  box-shadow: 0 2px 6px rgba(0,0,0,0.15);
  transform: scale(1.05);
}

.action-btn-sm:active {
  transform: scale(0.95);
  background-color: #f0f0f0;
}

.action-btn-sm:focus {
  outline: none;
  box-shadow: 0 0 0 3px rgba(102, 102, 102, 0.3);
}

/* 空状态 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 48px 24px;
  color: var(--text-hint);
}

.empty-icon {
  font-size: 64px;
  margin-bottom: 16px;
}

.empty-state p {
  margin-bottom: 16px;
}

.btn-primary {
  padding: 10px 24px;
  background-color: var(--primary-color);
  color: #fff;
  border: none;
  border-radius: var(--radius-md);
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-primary:hover {
  background-color: var(--primary-dark);
}

/* 分组区域和面包屑导航 */
.groups-section {
  margin-bottom: 24px;
}

.section-title {
  font-size: 16px;
  font-weight: 500;
  color: var(--text-primary);
  margin: 0 0 12px 0;
}

.groups-grid {
  display: grid;
  gap: 12px;
}

.groups-grid.grid-cols-auto {
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
}

.groups-grid.grid-cols-2 {
  grid-template-columns: repeat(2, 1fr);
}

.groups-grid.grid-cols-3 {
  grid-template-columns: repeat(3, 1fr);
}

.groups-grid.grid-cols-4 {
  grid-template-columns: repeat(4, 1fr);
}

.groups-grid.grid-cols-5 {
  grid-template-columns: repeat(5, 1fr);
}

/* 分组卡片高度根据列数调整 - 跟随书籍变化 */
.groups-grid.grid-cols-auto .book-group-card {
  min-height: 200px;
}

.groups-grid.grid-cols-2 .book-group-card {
  min-height: 300px;
}

.groups-grid.grid-cols-3 .book-group-card {
  min-height: 250px;
}

.groups-grid.grid-cols-4 .book-group-card {
  min-height: 220px;
}

.groups-grid.grid-cols-5 .book-group-card {
  min-height: 190px;
}

/* 分组卡片缩略图高度根据列数调整 */
.groups-grid.grid-cols-auto .book-group-card__thumbnail,
.groups-grid.grid-cols-auto .thumbnails-4,
.groups-grid.grid-cols-auto .thumbnails-9 .book-group-card__thumbnail {
  height: 60px;
  min-height: 60px;
}

.groups-grid.grid-cols-auto .thumbnails-4 {
  grid-template-rows: repeat(2, 60px);
}

.groups-grid.grid-cols-auto .thumbnails-9 {
  grid-template-rows: repeat(3, 60px);
}

.groups-grid.grid-cols-2 .book-group-card__thumbnail {
  height: 100px;
  min-height: 100px;
}

.groups-grid.grid-cols-2 .thumbnails-4 {
  grid-template-rows: repeat(2, 100px);
}

.groups-grid.grid-cols-2 .thumbnails-9 {
  grid-template-rows: repeat(3, 100px);
}

.groups-grid.grid-cols-3 .book-group-card__thumbnail {
  height: 80px;
  min-height: 80px;
}

.groups-grid.grid-cols-3 .thumbnails-4 {
  grid-template-rows: repeat(2, 80px);
}

.groups-grid.grid-cols-3 .thumbnails-9 {
  grid-template-rows: repeat(3, 80px);
}

.groups-grid.grid-cols-4 .book-group-card__thumbnail {
  height: 65px;
  min-height: 65px;
}

.groups-grid.grid-cols-4 .thumbnails-4 {
  grid-template-rows: repeat(2, 65px);
}

.groups-grid.grid-cols-4 .thumbnails-9 {
  grid-template-rows: repeat(3, 65px);
}

.groups-grid.grid-cols-5 .book-group-card__thumbnail {
  height: 55px;
  min-height: 55px;
}

.groups-grid.grid-cols-5 .thumbnails-4 {
  grid-template-rows: repeat(2, 55px);
}

.groups-grid.grid-cols-5 .thumbnails-9 {
  grid-template-rows: repeat(3, 55px);
}

/* 整理模式下的分组框网格 */
.groups-grid--organize {
  gap: 16px;
  margin-bottom: 24px;
}

.books-section {
  margin-top: 16px;
}

.breadcrumb-nav {
  display: flex;
  align-items: center;
  margin-bottom: 12px;
  font-size: 14px;
}

.breadcrumb-item {
  color: var(--text-secondary);
  cursor: pointer;
  transition: color 0.3s ease;
}

.breadcrumb-item:hover {
  color: var(--primary-color, #FF6B35);
}

.breadcrumb-item--current {
  color: var(--text-primary);
  cursor: default;
  font-weight: 500;
}

.breadcrumb-separator {
  margin: 0 8px;
  color: var(--text-hint);
}

/* 分组列表 */
.groups-header, .wishlist-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.groups-header h3, .wishlist-header h3 {
  font-size: 16px;
  font-weight: 500;
  color: var(--text-primary);
  margin: 0;
}

.btn-text {
  background: none;
  border: none;
  color: var(--primary-color);
  font-size: 14px;
  cursor: pointer;
}

.groups-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.group-item {
  display: flex;
  align-items: center;
  padding: 12px;
  background-color: var(--bg-card);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all 0.3s;
}

.group-item:hover {
  background-color: #f5f5f5;
}

.group-icon {
  font-size: 24px;
  margin-right: 12px;
}

.group-info {
  flex: 1;
}

.group-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
  display: block;
}

.group-count {
  font-size: 12px;
  color: var(--text-hint);
}

.group-actions {
  display: flex;
  gap: 8px;
}

/* 书单 */
.wishlist {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.wishlist-item {
  display: flex;
  align-items: center;
  padding: 12px;
  background-color: var(--bg-card);
  border-radius: var(--radius-md);
  gap: 12px;
}

.wishlist-title {
  flex: 1;
  font-size: 14px;
  color: var(--text-primary);
}

.wishlist-author {
  font-size: 12px;
  color: var(--text-hint);
}

/* 弹窗 */
.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
}

.dialog {
  background-color: var(--bg-card);
  border-radius: var(--radius-lg);
  width: 320px;
  max-width: 90%;
}

.dialog-group-selector {
  width: 380px;
  max-width: 90%;
}

.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid var(--border-light);
  font-size: 16px;
  font-weight: 500;
}

.dialog-close {
  font-size: 24px;
  color: var(--text-hint);
  cursor: pointer;
}

.dialog-body {
  padding: 24px 16px;
}

.dialog-body p {
  margin: 0;
  color: var(--text-secondary);
}

.dialog-body--group-selector {
  padding: 16px 0;
  max-height: 400px;
  overflow-y: auto;
}

.input {
  width: 100%;
  padding: 12px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  font-size: 14px;
  outline: none;
}

.input:focus {
  border-color: var(--primary-color);
}

.dialog-footer {
  display: flex;
  gap: 12px;
  padding: 16px;
  border-top: 1px solid var(--border-light);
}

.btn {
  flex: 1;
  padding: 10px 16px;
  border: none;
  border-radius: var(--radius-md);
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-default {
  background-color: #f5f5f5;
  color: var(--text-secondary);
}

.btn-danger {
  background-color: #f44336;
  color: #fff;
}

/* 分组选择器样式 */
.group-selector-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.group-selector-item {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  margin: 0;
  background-color: transparent;
}

.group-selector-item:hover {
  background-color: #f5f5f5;
}

.group-selector-item--selected {
  background-color: #e3f2fd;
}

.group-selector-item--selected .group-name-text {
  color: #2196f3;
}

.group-selector-item--create {
  border: 1px dashed #2196f3;
  color: #2196f3;
}

.group-selector-item--create:hover {
  background-color: #f0f8ff;
}

.group-item-content {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
}

.folder-icon {
  font-size: 20px;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.folder-icon--create {
  font-size: 24px;
  width: 28px;
  height: 28px;
  font-weight: bold;
}

.group-item-details {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.group-name-text {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
}

.group-count-text {
  font-size: 12px;
  color: var(--text-hint);
}

.check-icon {
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #2196f3;
  color: #fff;
  border-radius: 50%;
  font-size: 12px;
}

/* 状态选择器样式 */
.status-selector {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 12px;
}

.status-btn {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border: 2px solid var(--border-color);
  border-radius: 8px;
  background-color: #fff;
  font-size: 14px;
  color: var(--text-primary);
  cursor: pointer;
  transition: all 0.2s ease;
}

.status-btn:hover {
  border-color: var(--primary-color);
  background-color: #f5f5f5;
}

.status-btn.active {
  border-color: var(--primary-color);
  background-color: rgba(255, 107, 53, 0.05);
  color: var(--primary-color);
  font-weight: 500;
}

.status-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex-shrink: 0;
}

.status-dot--未读 {
  background-color: #9e9e9e;
}

.status-dot--在读 {
  background-color: var(--primary-color);
}

.status-dot--已读 {
  background-color: #4caf50;
}

/* 响应式设计 - 移除对列数的强制限制，让用户选择优先 */
@media (max-width: 640px) {
  .settings-menu {
    min-width: 200px;
  }

  .row-count-buttons {
    gap: 4px;
  }

  .row-btn {
    min-width: 40px;
    padding: 6px 8px;
    font-size: 12px;
  }
}

@media (max-width: 480px) {
  .dropdown-menu {
    right: -8px;
    min-width: 160px;
  }

  .settings-menu {
    min-width: 180px;
  }
}

/* 整理模式样式 */
.organize-mode-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1000;
  pointer-events: none;
}

.organize-top-bar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 56px;
  background-color: var(--bg-secondary);
  border-bottom: 1px solid var(--border-light);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  z-index: 2000;
  pointer-events: auto;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.organize-top-left,
.organize-top-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.organize-action-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background-color: #f5f5f5;
  border: none;
  border-radius: 20px;
  color: #555555;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.organize-action-btn svg {
  width: 18px;
  height: 18px;
  fill: currentColor;
}

.organize-action-btn:hover {
  background-color: #e0e0e0;
  color: #333333;
  transform: scale(1.02);
}

.organize-action-btn:active {
  transform: scale(0.98);
  background-color: #d0d0d0;
}

.selected-count {
  font-size: 14px;
  color: var(--text-secondary);
  font-weight: 500;
}

.organize-bottom-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: calc(72px + env(safe-area-inset-bottom, 0));
  padding-bottom: env(safe-area-inset-bottom, 0);
  background-color: var(--bg-secondary);
  border-top: 1px solid var(--border-light);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 8px 12px;
  z-index: 3000;
  pointer-events: auto;
  box-shadow: 0 -4px 16px rgba(0, 0, 0, 0.15);
  overflow-x: auto;
}

.organize-tool-btn {
  width: 52px;
  height: 52px;
  border: none;
  border-radius: 50%;
  background-color: #f5f5f5;
  color: #555555;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  flex-shrink: 0;
  min-width: 52px;
  min-height: 52px;
}

.organize-tool-btn svg {
  width: 24px;
  height: 24px;
  fill: currentColor;
  transition: all 0.2s ease;
}

.organize-tool-btn:hover {
  background-color: #e0e0e0;
  color: #333333;
  transform: translateY(-3px);
  box-shadow: 0 6px 12px rgba(0, 0, 0, 0.18);
}

.organize-tool-btn:active {
  transform: translateY(-1px) scale(0.92);
  background-color: #d0d0d0;
}

.organize-btn-delete {
  background-color: #ffebee;
  color: #d32f2f;
}

.organize-btn-delete:hover {
  background-color: #ffcdd2;
  color: #c62828;
  box-shadow: 0 6px 12px rgba(211, 47, 47, 0.3);
}

.organize-btn-delete svg {
  fill: currentColor;
}

.organize-btn-exit {
  background-color: var(--primary-color, #FF6B35);
  color: #fff;
}

.organize-btn-exit:hover {
  background-color: #e65a2f;
  box-shadow: 0 6px 16px rgba(255, 107, 53, 0.35);
}

.organize-btn-exit:active {
  background-color: #cc5629;
}

.organize-btn-exit svg {
  fill: currentColor;
}

/* 书籍卡片选择状态 */
.book-card--organize {
  cursor: pointer;
  transition: all 0.2s ease;
  border: 2px solid transparent;
}

.book-card--selected {
  border-color: var(--primary-color, #FF6B35) !important;
  box-shadow: 0 0 0 3px rgba(255, 107, 53, 0.15);
}

.book-card--organize:active {
  transform: scale(0.98);
}

.book-select-checkbox {
  position: absolute;
  top: 8px;
  left: 8px;
  width: 24px;
  height: 24px;
  z-index: 10;
  background-color: rgba(255, 255, 255, 0.95);
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  pointer-events: none;
}

.book-select-checkbox svg {
  width: 20px;
  height: 20px;
  fill: var(--primary-color, #FF6B35);
}

/* 整理模式下隐藏书籍操作按钮 */
.book-card--organize .book-actions {
  display: none;
}

/* 整理模式下内容区域下移，避免被顶部栏遮挡 */
.book-container:has(.organize-mode-overlay) .content {
  padding-top: 60px;
  padding-bottom: 80px;
}

@media (max-width: 640px) {
  .book-container:has(.organize-mode-overlay) .content {
    padding-bottom: 72px;
  }
}

@media (max-width: 480px) {
  .book-container:has(.organize-mode-overlay) .content {
    padding-bottom: 64px;
  }
}

/* 响应式设计 */
@media (max-width: 640px) {
  .organize-bottom-bar {
    height: calc(64px + env(safe-area-inset-bottom, 0));
    gap: 8px;
    padding: 6px 10px;
  }

  .organize-tool-btn {
    width: 48px;
    height: 48px;
    min-width: 48px;
    min-height: 48px;
  }

  .organize-tool-btn svg {
    width: 22px;
    height: 22px;
  }

  .organize-tool-btn:hover {
    transform: translateY(-2px);
  }

  .organize-action-btn {
    padding: 6px 12px;
    font-size: 13px;
  }

  .organize-action-btn svg {
    width: 16px;
    height: 16px;
  }

  .book-select-checkbox {
    width: 20px;
    height: 20px;
  }

  .book-select-checkbox svg {
    width: 16px;
    height: 16px;
  }
}

@media (max-width: 480px) {
  .organize-bottom-bar {
    height: calc(56px + env(safe-area-inset-bottom, 0));
    gap: 6px;
    padding: 4px 8px;
  }

  .organize-tool-btn {
    width: 44px;
    height: 44px;
    min-width: 44px;
    min-height: 44px;
  }

  .organize-tool-btn svg {
    width: 20px;
    height: 20px;
  }

  .organize-tool-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
  }

  .organize-top-bar {
    padding: 0 12px;
  }

  .organize-action-btn {
    padding: 5px 10px;
    font-size: 12px;
  }
}

/* 整理模式下隐藏全局底部导航栏 */
.book-container:has(.organize-mode-overlay) ~ .bottom-nav {
  display: none !important;
}

/* ==================== 高级筛选样式 ==================== */

.filter-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  z-index: 2000;
}

.filter-dialog {
  background-color: #fff;
  border-radius: 16px 16px 0 0;
  width: 100%;
  max-width: 600px;
  max-height: 85vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.filter-header {
  display: flex;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-light);
  gap: 12px;
}

.filter-title {
  flex: 1;
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.filter-count {
  font-size: 12px;
  color: var(--text-hint);
  padding: 4px 8px;
  background-color: rgba(255, 107, 53, 0.1);
  border-radius: 12px;
}

.filter-body {
  padding: 20px;
  overflow-y: auto;
  flex: 1;
}

.filter-section {
  margin-bottom: 24px;
}

.filter-section:last-child {
  margin-bottom: 0;
}

.filter-label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: var(--text-secondary);
  margin-bottom: 12px;
}

.filter-options {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.filter-option-btn {
  padding: 6px 16px;
  border: 1px solid var(--border-color);
  background-color: #fff;
  border-radius: 20px;
  font-size: 14px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s ease;
}

.filter-option-btn:hover {
  background-color: #f5f5f5;
  border-color: var(--primary-color, #FF6B35);
}

.filter-option-btn--active {
  background-color: rgba(255, 107, 53, 0.1);
  border-color: var(--primary-color, #FF6B35);
  color: var(--primary-color, #FF6B35);
  font-weight: 500;
}

.tags-filter {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.filter-tag {
  padding: 6px 14px;
  border: 1px solid var(--border-color);
  background-color: #fff;
  border-radius: 16px;
  font-size: 13px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s ease;
}

.filter-tag:hover {
  border-color: var(--primary-color, #FF6B35);
}

.filter-tag--active {
  background-color: rgba(255, 107, 53, 0.1);
  border-color: var(--primary-color, #FF6B35);
  color: var(--primary-color, #FF6B35);
}

.no-tags {
  color: var(--text-hint);
  font-size: 13px;
  padding: 8px 0;
}

.filter-search {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background-color: #fff;
}

.search-icon-small {
  width: 16px;
  height: 16px;
  fill: var(--text-hint);
  flex-shrink: 0;
}

.filter-input {
  flex: 1;
  padding: 8px;
  border: none;
  outline: none;
  font-size: 14px;
  color: var(--text-primary);
  min-width: 0;
}

.filter-input::placeholder {
  color: var(--text-hint);
}

.clear-input-btn {
  width: 20px;
  height: 20px;
  border: none;
  background-color: #f0f0f0;
  border-radius: 50%;
  color: var(--text-hint);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  transition: all 0.2s ease;
}

.clear-input-btn:hover {
  background-color: #e0e0e0;
  color: var(--text-primary);
}

.filter-select {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background-color: #fff;
  font-size: 14px;
  color: var(--text-primary);
  outline: none;
  cursor: pointer;
}

.filter-select:focus {
  border-color: var(--primary-color, #FF6B35);
}

.filter-footer {
  display: flex;
  gap: 12px;
  padding: 16px 20px;
  border-top: 1px solid var(--border-light);
}

/* ==================== 筛选按钮样式 ==================== */

.filter-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border: 1px solid var(--border-color);
  background-color: #fff;
  border-radius: 20px;
  font-size: 14px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
}

.filter-btn:hover {
  background-color: #f5f5f5;
  border-color: var(--primary-color, #FF6B35);
}

.filter-btn--active {
  background-color: rgba(255, 107, 53, 0.1);
  border-color: var(--primary-color, #FF6B35);
  color: var(--primary-color, #FF6B35);
  font-weight: 500;
}

.filter-icon {
  width: 16px;
  height: 16px;
  fill: currentColor;
}

.filter-badge {
  min-width: 18px;
  height: 18px;
  padding: 0 6px;
  background-color: var(--primary-color, #FF6B35);
  color: #fff;
  border-radius: 9px;
  font-size: 11px;
  font-weight: 500;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 18px;
}
</style>

<style>
/* 全局样式：整理模式下隐藏底部导航栏 */
body.organize-mode-active .bottom-nav {
  display: none !important;
}

/* 整理模式下调整内容底部间距 */
body.organize-mode-active .main-content {
  padding-bottom: 72px !important;
}

@media (max-width: 640px) {
  body.organize-mode-active .main-content {
    padding-bottom: 64px !important;
  }
}

@media (max-width: 480px) {
  body.organize-mode-active .main-content {
    padding-bottom: 56px !important;
  }
}
</style>