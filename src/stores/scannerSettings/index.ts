import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { ScannerSettings, CountryCode, ScannerSettingsState, ScannerSettingsActions, ScannerSettingsGetters } from './types';

export const useScannerSettingsStore = defineStore('scannerSettings', () => {
  const STORAGE_KEY = 'scannerSettings';

  const settings = ref<ScannerSettings>({
    isbnLength: 13,
    countryPrefix: '978-7',
    countryName: '中国'
  });

  const countryCodes = ref<CountryCode[]>([
    { name: '中国', prefix: '978-7' },
    { name: '中国香港', prefix: '978-962' },
    { name: '中国香港', prefix: '978-988' },
    { name: '中国台湾', prefix: '978-957' },
    { name: '中国台湾', prefix: '978-986' },
    { name: '中国澳门', prefix: '978-99937' },
    { name: '中国澳门', prefix: '978-99965' },
    { name: '美国', prefix: '978-0' },
    { name: '美国', prefix: '978-1' },
    { name: '美国', prefix: '979-8' },
    { name: '英国和爱尔兰', prefix: '978-0' },
    { name: '英国和爱尔兰', prefix: '978-1' },
    { name: '澳大利亚', prefix: '978-0' },
    { name: '澳大利亚', prefix: '978-1' },
    { name: '加拿大', prefix: '978-0' },
    { name: '加拿大', prefix: '978-1' },
    { name: '加拿大', prefix: '978-2' },
    { name: '新西兰', prefix: '978-0' },
    { name: '新西兰', prefix: '978-1' },
    { name: '南非', prefix: '978-0' },
    { name: '南非', prefix: '978-1' },
    { name: '津巴布韦', prefix: '978-0' },
    { name: '津巴布韦', prefix: '978-1' },
    { name: '斯威士兰', prefix: '978-0' },
    { name: '直布罗陀', prefix: '978-0' },
    { name: '直布罗陀', prefix: '978-1' },
    { name: '法国', prefix: '978-2' },
    { name: '法国', prefix: '979-10' },
    { name: '比利时', prefix: '978-2' },
    { name: '瑞士', prefix: '978-2' },
    { name: '瑞士', prefix: '978-3' },
    { name: '卢森堡', prefix: '978-2' },
    { name: '卢森堡', prefix: '978-99959' },
    { name: '德国', prefix: '978-3' },
    { name: '奥地利', prefix: '978-3' },
    { name: '日本', prefix: '978-4' },
    { name: '前苏联', prefix: '978-5' },
    { name: '伊朗', prefix: '978-600' },
    { name: '伊朗', prefix: '978-964' },
    { name: '哈萨克斯坦', prefix: '978-601' },
    { name: '哈萨克斯坦', prefix: '978-9965' },
    { name: '印尼', prefix: '978-602' },
    { name: '印尼', prefix: '978-979' },
    { name: '沙特阿拉伯', prefix: '978-603' },
    { name: '沙特阿拉伯', prefix: '978-9960' },
    { name: '越南', prefix: '978-604' },
    { name: '土耳其', prefix: '978-605' },
    { name: '土耳其', prefix: '978-975' },
    { name: '土耳其', prefix: '978-9944' },
    { name: '罗马尼亚', prefix: '978-606' },
    { name: '罗马尼亚', prefix: '978-973' },
    { name: '墨西哥', prefix: '978-607' },
    { name: '墨西哥', prefix: '978-968' },
    { name: '墨西哥', prefix: '978-970' },
    { name: '马其顿', prefix: '978-608' },
    { name: '立陶宛', prefix: '978-609' },
    { name: '立陶宛', prefix: '978-9955' },
    { name: '立陶宛', prefix: '978-9986' },
    { name: '泰国', prefix: '978-611' },
    { name: '泰国', prefix: '978-616' },
    { name: '泰国', prefix: '978-974' },
    { name: '秘鲁', prefix: '978-612' },
    { name: '秘鲁', prefix: '978-9972' },
    { name: '毛里求斯', prefix: '978-613' },
    { name: '毛里求斯', prefix: '978-99903' },
    { name: '毛里求斯', prefix: '978-99949' },
    { name: '黎巴嫩', prefix: '978-614' },
    { name: '黎巴嫩', prefix: '978-9953' },
    { name: '匈牙利', prefix: '978-615' },
    { name: '匈牙利', prefix: '978-963' },
    { name: '希腊', prefix: '978-618' },
    { name: '希腊', prefix: '978-960' },
    { name: '保加利亚', prefix: '978-619' },
    { name: '保加利亚', prefix: '978-954' },
    { name: '捷克', prefix: '978-80' },
    { name: '斯洛伐克', prefix: '978-80' },
    { name: '印度', prefix: '978-81' },
    { name: '印度', prefix: '978-93' },
    { name: '挪威', prefix: '978-82' },
    { name: '波兰', prefix: '978-83' },
    { name: '西班牙', prefix: '978-84' },
    { name: '巴西', prefix: '978-85' },
    { name: '塞尔维亚', prefix: '978-86' },
    { name: '丹麦', prefix: '978-87' },
    { name: '意大利', prefix: '978-88' },
    { name: '韩国', prefix: '978-89' },
    { name: '荷兰', prefix: '978-90' },
    { name: '荷兰', prefix: '978-94' },
    { name: '瑞典', prefix: '978-91' },
    { name: '欧洲共同体', prefix: '978-92' },
    { name: '国际非政府组织', prefix: '978-92' },
    { name: '阿根廷', prefix: '978-950' },
    { name: '阿根廷', prefix: '978-987' },
    { name: '芬兰', prefix: '978-951' },
    { name: '芬兰', prefix: '978-952' },
    { name: '克罗地亚', prefix: '978-953' },
    { name: '斯里兰卡', prefix: '978-955' },
    { name: '智利', prefix: '978-956' },
    { name: '哥伦比亚', prefix: '978-958' },
    { name: '古巴', prefix: '978-959' },
    { name: '斯洛文尼亚', prefix: '978-961' },
    { name: '以色列', prefix: '978-965' },
    { name: '马来西亚', prefix: '978-967' },
    { name: '巴基斯坦', prefix: '978-969' },
    { name: '菲律宾', prefix: '978-971' },
    { name: '葡萄牙', prefix: '978-972' },
    { name: '葡萄牙', prefix: '978-989' },
    { name: '加勒比共同体', prefix: '978-976' },
    { name: '埃及', prefix: '978-977' },
    { name: '尼日利亚', prefix: '978-978' },
    { name: '委内瑞拉', prefix: '978-980' },
    { name: '新加坡', prefix: '978-981' },
    { name: '新加坡', prefix: '978-9971' },
    { name: '南太平洋', prefix: '978-982' },
    { name: '孟加拉国', prefix: '978-984' },
    { name: '白俄罗斯', prefix: '978-985' },
    { name: '卡塔尔', prefix: '978-9927' },
    { name: '卡塔尔', prefix: '978-99921' },
    { name: '阿尔巴尼亚', prefix: '978-9928' },
    { name: '阿尔巴尼亚', prefix: '978-99927' },
    { name: '危地马拉', prefix: '978-9929' },
    { name: '危地马拉', prefix: '978-99922' },
    { name: '危地马拉', prefix: '978-99939' },
    { name: '哥斯达黎加', prefix: '978-9930' },
    { name: '哥斯达黎加', prefix: '978-9968' },
    { name: '哥斯达黎加', prefix: '978-9977' },
    { name: '阿尔及利亚', prefix: '978-9931' },
    { name: '阿尔及利亚', prefix: '978-9947' },
    { name: '老挝', prefix: '978-9932' },
    { name: '叙利亚', prefix: '978-9933' },
    { name: '拉脱维亚', prefix: '978-9934' },
    { name: '拉脱维亚', prefix: '978-9984' },
    { name: '冰岛', prefix: '978-9935' },
    { name: '冰岛', prefix: '978-9979' },
    { name: '阿富汗', prefix: '978-9936' },
    { name: '尼泊尔', prefix: '978-9937' },
    { name: '尼泊尔', prefix: '978-99933' },
    { name: '尼泊尔', prefix: '978-99946' },
    { name: '突尼斯', prefix: '978-9938' },
    { name: '突尼斯', prefix: '978-9973' },
    { name: '亚美尼亚', prefix: '978-9939' },
    { name: '亚美尼亚', prefix: '978-99930' },
    { name: '黑山', prefix: '978-9940' },
    { name: '黑山', prefix: '978-86' },
    { name: '格鲁吉亚', prefix: '978-9941' },
    { name: '格鲁吉亚', prefix: '978-99928' },
    { name: '格鲁吉亚', prefix: '978-99940' },
    { name: '厄瓜多尔', prefix: '978-9942' },
    { name: '厄瓜多尔', prefix: '978-9978' },
    { name: '乌兹别克斯坦', prefix: '978-9943' },
    { name: '多米尼加', prefix: '978-9945' },
    { name: '朝鲜', prefix: '978-9946' },
    { name: '阿拉伯联合酋长国', prefix: '978-9948' },
    { name: '爱沙尼亚', prefix: '978-9949' },
    { name: '爱沙尼亚', prefix: '978-9985' },
    { name: '巴勒斯坦', prefix: '978-9950' },
    { name: '科索沃', prefix: '978-9951' },
    { name: '阿塞拜疆', prefix: '978-9952' },
    { name: '摩洛哥', prefix: '978-9954' },
    { name: '摩洛哥', prefix: '978-9981' },
    { name: '喀麦隆', prefix: '978-9956' },
    { name: '约旦', prefix: '978-9957' },
    { name: '波黑', prefix: '978-9958' },
    { name: '利比亚', prefix: '978-9959' },
    { name: '巴拿马', prefix: '978-9962' },
    { name: '塞浦路斯', prefix: '978-9963' },
    { name: '加纳', prefix: '978-9964' },
    { name: '加纳', prefix: '978-9988' },
    { name: '肯尼亚', prefix: '978-9966' },
    { name: '吉尔吉斯斯坦', prefix: '978-9967' },
    { name: '乌干达', prefix: '978-9970' },
    { name: '乌拉圭', prefix: '978-9974' },
    { name: '摩尔多瓦', prefix: '978-9975' },
    { name: '坦桑尼亚', prefix: '978-9976' },
    { name: '坦桑尼亚', prefix: '978-9987' },
    { name: '巴布亚新几内亚', prefix: '978-9980' },
    { name: '赞比亚', prefix: '978-9982' },
    { name: '冈比亚', prefix: '978-9983' },
    { name: '巴林', prefix: '978-99901' },
    { name: '巴林', prefix: '978-99958' },
    { name: '加蓬', prefix: '978-99902' },
    { name: '荷属安的列斯和阿鲁巴', prefix: '978-99904' },
    { name: '玻利维亚', prefix: '978-99905' },
    { name: '玻利维亚', prefix: '978-99954' },
    { name: '科威特', prefix: '978-99906' },
    { name: '马拉维', prefix: '978-99908' },
    { name: '马拉维', prefix: '978-99960' },
    { name: '马耳他', prefix: '978-99909' },
    { name: '马耳他', prefix: '978-99932' },
    { name: '马耳他', prefix: '978-99957' },
    { name: '塞拉利昂', prefix: '978-99910' },
    { name: '莱索托', prefix: '978-99911' },
    { name: '博茨瓦纳', prefix: '978-99912' },
    { name: '博茨瓦纳', prefix: '978-99968' },
    { name: '安道尔', prefix: '978-99913' },
    { name: '安道尔', prefix: '978-99920' },
    { name: '苏里南', prefix: '978-99914' },
    { name: '马尔代夫', prefix: '978-99915' },
    { name: '纳米比亚', prefix: '978-99916' },
    { name: '纳米比亚', prefix: '978-99945' },
    { name: '文莱', prefix: '978-99917' },
    { name: '法罗群岛', prefix: '978-99918' },
    { name: '贝宁', prefix: '978-99919' },
    { name: '萨尔瓦多', prefix: '978-99923' },
    { name: '萨尔瓦多', prefix: '978-99961' },
    { name: '尼加拉瓜', prefix: '978-99924' },
    { name: '尼加拉瓜', prefix: '978-99964' },
    { name: '巴拉圭', prefix: '978-99925' },
    { name: '巴拉圭', prefix: '978-99953' },
    { name: '洪都拉斯', prefix: '978-99926' },
    { name: '蒙古', prefix: '978-99929' },
    { name: '蒙古', prefix: '978-99962' },
    { name: '塞舌尔', prefix: '978-99931' },
    { name: '海地', prefix: '978-99935' },
    { name: '不丹', prefix: '978-99936' },
    { name: '塞尔维亚', prefix: '978-99938' },
    { name: '塞尔维亚', prefix: '978-99955' },
    { name: '苏丹', prefix: '978-99942' },
    { name: '埃塞俄比亚', prefix: '978-99944' },
    { name: '塔吉克斯坦', prefix: '978-99947' },
    { name: '厄立特里亚', prefix: '978-99948' },
    { name: '柬埔寨', prefix: '978-99950' },
    { name: '柬埔寨', prefix: '978-99963' },
    { name: '刚果', prefix: '978-99951' },
    { name: '马里', prefix: '978-99952' },
    { name: '阿曼', prefix: '978-99969' }
  ]);

  const currentCountryCode = computed<CountryCode | null>(() => {
    return countryCodes.value.find(code => code.prefix === settings.value.countryPrefix) || null;
  });

  const filteredCountryCodes = computed<CountryCode[]>(() => {
    const uniqueCountries = new Map<string, CountryCode>();
    countryCodes.value.forEach(code => {
      if (!uniqueCountries.has(code.name)) {
        uniqueCountries.set(code.name, code);
      }
    });
    return Array.from(uniqueCountries.values()).sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'));
  });

  const setIsbnLength = (length: number) => {
    settings.value.isbnLength = length;
    saveSettings();
  };

  const setCountryPrefix = (prefix: string, name: string) => {
    settings.value.countryPrefix = prefix;
    settings.value.countryName = name;
    saveSettings();
  };

  const setCountryCodes = (codes: CountryCode[]) => {
    countryCodes.value = codes;
  };

  const loadSettings = () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        settings.value = {
          isbnLength: parsed.isbnLength || 13,
          countryPrefix: parsed.countryPrefix || '978-7',
          countryName: parsed.countryName || '中国'
        };
      }
    } catch (e) {
      console.error('加载扫描设置失败:', e);
    }
  };

  const saveSettings = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings.value));
    } catch (e) {
      console.error('保存扫描设置失败:', e);
    }
  };

  loadSettings();

  return {
    settings,
    countryCodes,
    currentCountryCode,
    filteredCountryCodes,
    setIsbnLength,
    setCountryPrefix,
    setCountryCodes,
    loadSettings,
    saveSettings
  };
});
