'use client';

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import styles from './real-map.module.css';

type MapStatus = 'planned' | 'done' | 'deferred';
type PointSource = 'agent' | 'user';

export type CultureMapPoint = {
  id: string;
  time: string;
  title: string;
  kind: string;
  duration: number;
  distance: number;
  indoor: boolean;
  observe: string;
  collect: string;
  culture: string;
  status: MapStatus;
  lng?: number;
  lat?: number;
  address?: string;
  source?: PointSource;
  poiId?: string;
  photoUrl?: string;
};

type PointPatch = Partial<Pick<CultureMapPoint, 'lng' | 'lat' | 'address' | 'kind' | 'distance' | 'photoUrl' | 'poiId'>>;

type Props = {
  points: CultureMapPoint[];
  selectedId: string;
  onSelect: (id: string) => void;
  onHydratePoint: (id: string, patch: PointPatch) => void;
  onAddPoint: (point: CultureMapPoint) => void;
  onRemovePoint: (id: string) => void;
  onMovePoint: (id: string, direction: -1 | 1) => void;
  onToggleComplete: (id: string) => void;
  onExplain: (point: CultureMapPoint) => void;
  onPhotograph: (point: CultureMapPoint) => void;
  onCollect: (point: CultureMapPoint) => void;
  onGenerate: () => void;
  onAgentReplan: () => void;
  onNotice: (message: string) => void;
};

declare global {
  interface Window {
    AMapLoader?: {
      load: (options: Record<string, unknown>) => Promise<any>;
    };
    _AMapSecurityConfig?: { securityJsCode: string };
  }
}

const AMAP_LOADER_ID = 'muling-amap-loader-v2';
const KAIFENG_CENTER = [114.307581, 34.797239];
const CATEGORY_OPTIONS = [
  { label: '全部', keyword: '景点' },
  { label: '古建筑', keyword: '古建筑' },
  { label: '博物馆', keyword: '博物馆' },
  { label: '非遗', keyword: '非物质文化遗产' },
  { label: '古街', keyword: '历史街区' },
  { label: '园林', keyword: '公园园林' },
  { label: '宗教建筑', keyword: '寺庙道观' },
  { label: '文化场馆', keyword: '文化馆' },
];

function loadAmapLoader() {
  if (window.AMapLoader) return Promise.resolve(window.AMapLoader);
  return new Promise<NonNullable<Window['AMapLoader']>>((resolve, reject) => {
    const existing = document.getElementById(AMAP_LOADER_ID) as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener('load', () => window.AMapLoader ? resolve(window.AMapLoader) : reject(new Error('高德地图加载器不可用')), { once: true });
      existing.addEventListener('error', () => reject(new Error('高德地图加载器下载失败')), { once: true });
      return;
    }
    const script = document.createElement('script');
    script.id = AMAP_LOADER_ID;
    script.src = 'https://webapi.amap.com/loader.js';
    script.async = true;
    script.onload = () => window.AMapLoader ? resolve(window.AMapLoader) : reject(new Error('高德地图加载器不可用'));
    script.onerror = () => reject(new Error('高德地图加载器下载失败，请检查网络连接'));
    document.head.appendChild(script);
  });
}

function numberFrom(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function locationOf(poi: any): [number, number] | null {
  const location = poi?.location;
  if (!location) return null;
  const lng = typeof location.getLng === 'function' ? location.getLng() : numberFrom(location.lng ?? location[0]);
  const lat = typeof location.getLat === 'function' ? location.getLat() : numberFrom(location.lat ?? location[1]);
  return typeof lng === 'number' && typeof lat === 'number' ? [lng, lat] : null;
}

function pointCategory(type: unknown) {
  const value = typeof type === 'string' ? type : '';
  const parts = value.split(';').filter(Boolean);
  return parts[parts.length - 1] || parts[0] || '文化地点';
}

function makePoint(poi: any, source: PointSource = 'user'): CultureMapPoint | null {
  const location = locationOf(poi);
  if (!location) return null;
  const title = typeof poi.name === 'string' && poi.name.trim() ? poi.name.trim() : '地图选中地点';
  const kind = pointCategory(poi.type);
  const addressParts = [poi.pname, poi.cityname, poi.adname, poi.address].filter((item, index, all) =>
    typeof item === 'string' && item.trim() && all.indexOf(item) === index);
  const photo = Array.isArray(poi.photos) && poi.photos[0] && typeof poi.photos[0].url === 'string' ? poi.photos[0].url : undefined;
  const rawDistance = numberFrom(poi.distance);
  const distance = rawDistance === undefined ? 0 : Math.round(rawDistance / 100) / 10;
  const museumLike = /博物馆|纪念馆|展览馆|文化馆/.test(kind + title);
  const heritageLike = /非遗|年画|民俗/.test(kind + title);
  return {
    id: typeof poi.id === 'string' && poi.id ? 'amap-' + poi.id : 'map-' + location.join('-'),
    poiId: typeof poi.id === 'string' ? poi.id : undefined,
    time: '待安排',
    title,
    kind,
    duration: museumLike ? 90 : heritageLike ? 75 : 60,
    distance,
    indoor: museumLike,
    observe: museumLike ? '留意展陈中的实物、纹样、色彩与工艺说明' : '留意建筑结构、门窗、屋顶、牌匾和装饰纹样',
    collect: '拍摄有代表性的结构、色彩与纹样，并记录现场说明牌',
    culture: '该地点来自高德地图实时返回的 POI 数据。文化讲解会结合地点名称、类别和用户后续提问生成，并明确区分地图事实与文化解释。',
    status: 'planned',
    lng: location[0],
    lat: location[1],
    address: addressParts.join(''),
    source,
    photoUrl: photo,
  };
}

function markerContent(point: CultureMapPoint, order: number, active: boolean) {
  const background = point.source === 'agent' ? '#a12f29' : '#d4882f';
  const label = point.status === 'done' ? '✓' : String(order);
  return '<div style="display:flex;align-items:center;gap:5px;padding:4px 9px 4px 4px;background:#fff;border:2px solid ' +
    background + ';border-radius:999px;box-shadow:0 4px 13px rgba(60,35,25,.25);transform:' +
    (active ? 'scale(1.08)' : 'scale(1)') + ';white-space:nowrap"><b style="display:grid;place-items:center;width:25px;height:25px;border-radius:50%;color:#fff;background:' +
    background + ';font-size:11px">' + label + '</b><span style="color:#58362e;font-size:12px;font-weight:700">' +
    point.title.replace(/[<>&"']/g, '') + '</span></div>';
}

export default function RealMapExplorer(props: Props) {
  const {
    points, selectedId, onSelect, onHydratePoint, onAddPoint, onRemovePoint, onMovePoint,
    onToggleComplete, onExplain, onPhotograph, onCollect, onGenerate, onAgentReplan, onNotice,
  } = props;
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const itineraryRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const amapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const searchMarkersRef = useRef<any[]>([]);
  const drivingRef = useRef<any>(null);
  const initializedRef = useRef(false);
  const pointsRef = useRef(points);
  const [mapKey, setMapKey] = useState('');
  const [securityCode, setSecurityCode] = useState('');
  const [keyInput, setKeyInput] = useState('');
  const [codeInput, setCodeInput] = useState('');
  const [mapState, setMapState] = useState<'missing' | 'loading' | 'ready' | 'error'>('loading');
  const [mapError, setMapError] = useState('');
  const [keyword, setKeyword] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<CultureMapPoint[]>([]);
  const [candidate, setCandidate] = useState<CultureMapPoint | null>(null);
  const [category, setCategory] = useState('全部');
  const [routeSummary, setRouteSummary] = useState('等待真实路线计算');

  pointsRef.current = points;
  const selected = candidate || points.find(point => point.id === selectedId) || points[0];
  const selectedIsInTrip = Boolean(selected && points.some(point => point.id === selected.id));

  useEffect(() => {
    const envKey = process.env.NEXT_PUBLIC_AMAP_KEY || '';
    const envCode = process.env.NEXT_PUBLIC_AMAP_SECURITY_CODE || '';
    const storedKey = localStorage.getItem('__muling_amap_key__') || '';
    const storedCode = localStorage.getItem('__muling_amap_security_code__') || '';
    const nextKey = storedKey || envKey;
    const nextCode = storedCode || envCode;
    setMapKey(nextKey);
    setSecurityCode(nextCode);
    setKeyInput(nextKey);
    setCodeInput(nextCode);
    if (!nextKey || !nextCode) setMapState('missing');
  }, []);

  useEffect(() => {
    if (!mapKey || !securityCode || !mapContainerRef.current || initializedRef.current) return;
    let cancelled = false;
    initializedRef.current = true;
    setMapState('loading');
    window._AMapSecurityConfig = { securityJsCode: securityCode };
    void loadAmapLoader().then(loader => loader.load({
      key: mapKey,
      version: '2.0',
      plugins: ['AMap.PlaceSearch', 'AMap.Geolocation', 'AMap.Geocoder', 'AMap.ToolBar', 'AMap.Scale', 'AMap.Driving'],
    })).then(AMap => {
      if (cancelled || !mapContainerRef.current) return;
      amapRef.current = AMap;
      const map = new AMap.Map(mapContainerRef.current, {
        viewMode: '2D',
        zoom: 11,
        center: KAIFENG_CENTER,
        resizeEnable: true,
        showLabel: true,
      });
      map.addControl(new AMap.ToolBar({ position: 'RB' }));
      map.addControl(new AMap.Scale());
      mapRef.current = map;
      setMapState('ready');
      map.on('click', (event: any) => {
        const geocoder = new AMap.Geocoder({ city: '开封' });
        geocoder.getAddress(event.lnglat, (status: string, result: any) => {
          if (status !== 'complete' || !result?.regeocode) return;
          const nearby = result.regeocode.pois?.[0];
          const point = nearby ? makePoint(nearby) : makePoint({
            name: result.regeocode.formattedAddress || '地图选中位置',
            address: result.regeocode.formattedAddress,
            location: event.lnglat,
            type: '地图选点',
          });
          if (point) {
            setCandidate(point);
            map.panTo([point.lng, point.lat]);
          }
        });
      });
    }).catch(error => {
      initializedRef.current = false;
      setMapState('error');
      setMapError(error instanceof Error ? error.message : '真实地图加载失败');
    });
    return () => {
      cancelled = true;
      if (mapRef.current) mapRef.current.destroy();
      mapRef.current = null;
      amapRef.current = null;
      initializedRef.current = false;
    };
  }, [mapKey, securityCode]);

  useEffect(() => {
    if (mapState !== 'ready' || !amapRef.current) return;
    const AMap = amapRef.current;
    const unresolved = points.filter(point => typeof point.lng !== 'number' || typeof point.lat !== 'number');
    unresolved.forEach(point => {
      const search = new AMap.PlaceSearch({ city: '开封', citylimit: true, pageSize: 6, extensions: 'all' });
      search.search(point.title, (status: string, result: any) => {
        const pois = status === 'complete' ? result?.poiList?.pois || [] : [];
        const exact = pois.find((poi: any) => typeof poi.name === 'string' && poi.name.includes(point.title.replace('木版年画', ''))) || pois[0];
        const resolved = exact ? makePoint(exact, point.source || 'agent') : null;
        if (resolved) onHydratePoint(point.id, {
          lng: resolved.lng, lat: resolved.lat, address: resolved.address, kind: resolved.kind,
          distance: resolved.distance, photoUrl: resolved.photoUrl, poiId: resolved.poiId,
        });
      });
    });
  }, [mapState, points, onHydratePoint]);

  useEffect(() => {
    if (mapState !== 'ready' || !mapRef.current || !amapRef.current) return;
    const map = mapRef.current;
    const AMap = amapRef.current;
    markersRef.current.forEach(marker => map.remove(marker));
    markersRef.current = points.filter(point => typeof point.lng === 'number' && typeof point.lat === 'number').map((point, index) => {
      const marker = new AMap.Marker({
        position: [point.lng, point.lat],
        anchor: 'bottom-center',
        offset: new AMap.Pixel(0, -5),
        content: markerContent(point, index + 1, point.id === selectedId),
        zIndex: point.id === selectedId ? 130 : 110,
      });
      marker.on('click', () => {
        setCandidate(null);
        onSelect(point.id);
        map.panTo([point.lng, point.lat]);
      });
      map.add(marker);
      return marker;
    });
  }, [mapState, points, selectedId, onSelect]);

  useEffect(() => {
    if (mapState !== 'ready' || !mapRef.current || !amapRef.current) return;
    const located = points.filter(point => point.status !== 'deferred' && typeof point.lng === 'number' && typeof point.lat === 'number');
    if (drivingRef.current) drivingRef.current.clear();
    if (located.length < 2) {
      setRouteSummary(located.length ? '行程至少需要两个地点才能计算路线' : '等待地点坐标');
      return;
    }
    const AMap = amapRef.current;
    const driving = new AMap.Driving({ map: mapRef.current, hideMarkers: true, showTraffic: false, autoFitView: true });
    drivingRef.current = driving;
    const start = [located[0].lng, located[0].lat];
    const end = [located[located.length - 1].lng, located[located.length - 1].lat];
    const waypoints = located.slice(1, -1).map(point => [point.lng, point.lat]);
    driving.search(start, end, { waypoints }, (status: string, result: any) => {
      if (status !== 'complete' || !result?.routes?.[0]) {
        setRouteSummary('真实路线暂未计算成功，请调整地点后重试');
        return;
      }
      const route = result.routes[0];
      const km = Math.round(Number(route.distance || 0) / 100) / 10;
      const minutes = Math.max(1, Math.round(Number(route.time || 0) / 60));
      setRouteSummary('驾车约 ' + km + ' km · 预计 ' + minutes + ' 分钟');
    });
    return () => driving.clear();
  }, [mapState, points]);

  function saveMapConfig(event: FormEvent) {
    event.preventDefault();
    const key = keyInput.trim();
    const code = codeInput.trim();
    if (!key || !code) {
      setMapError('请同时填写高德 Web 端 JS API Key 和安全密钥。');
      return;
    }
    localStorage.setItem('__muling_amap_key__', key);
    localStorage.setItem('__muling_amap_security_code__', code);
    window.location.reload();
  }

  function clearSearchMarkers() {
    if (!mapRef.current) return;
    searchMarkersRef.current.forEach(marker => mapRef.current.remove(marker));
    searchMarkersRef.current = [];
  }

  function showResults(results: CultureMapPoint[], fit = true) {
    setSearchResults(results);
    clearSearchMarkers();
    if (!mapRef.current || !amapRef.current) return;
    const AMap = amapRef.current;
    searchMarkersRef.current = results.map((point, index) => {
      const marker = new AMap.Marker({
        position: [point.lng, point.lat],
        anchor: 'bottom-center',
        content: '<div style="display:grid;place-items:center;width:29px;height:29px;color:#fff;background:#d4882f;border:2px solid #fff;border-radius:50%;box-shadow:0 3px 10px rgba(60,35,25,.3);font-weight:800">' + (index + 1) + '</div>',
      });
      marker.on('click', () => focusPoint(point));
      mapRef.current.add(marker);
      return marker;
    });
    if (fit && searchMarkersRef.current.length) mapRef.current.setFitView(searchMarkersRef.current);
  }

  function focusPoint(point: CultureMapPoint) {
    setCandidate(point);
    if (mapRef.current && typeof point.lng === 'number' && typeof point.lat === 'number') {
      mapRef.current.setZoomAndCenter(15, [point.lng, point.lat]);
    }
  }

  function searchPois(event?: FormEvent) {
    event?.preventDefault();
    if (!keyword.trim() || mapState !== 'ready' || !amapRef.current) return;
    setSearching(true);
    const placeSearch = new amapRef.current.PlaceSearch({ city: '开封', citylimit: true, pageSize: 12, extensions: 'all' });
    placeSearch.search(keyword.trim(), (status: string, result: any) => {
      setSearching(false);
      const pois = status === 'complete' ? result?.poiList?.pois || [] : [];
      const results = pois.map((poi: any) => makePoint(poi)).filter(Boolean) as CultureMapPoint[];
      showResults(results);
      if (results[0]) focusPoint(results[0]);
      else onNotice('高德地图没有找到匹配地点，请尝试更具体的关键词。');
    });
  }

  function exploreNearby(option = CATEGORY_OPTIONS.find(item => item.label === category) || CATEGORY_OPTIONS[0]) {
    if (mapState !== 'ready' || !amapRef.current || !mapRef.current) return;
    setCategory(option.label);
    setSearching(true);
    const AMap = amapRef.current;
    const geolocation = new AMap.Geolocation({ enableHighAccuracy: true, timeout: 10000, zoomToAccuracy: true });
    geolocation.getCurrentPosition((status: string, result: any) => {
      if (status !== 'complete' || !result?.position) {
        setSearching(false);
        onNotice('定位失败。浏览器定位通常需要允许位置权限；正式部署建议使用 HTTPS。');
        return;
      }
      mapRef.current.setZoomAndCenter(14, result.position);
      const placeSearch = new AMap.PlaceSearch({ city: '开封', pageSize: 16, extensions: 'all' });
      placeSearch.searchNearBy(option.keyword, result.position, 8000, (poiStatus: string, poiResult: any) => {
        setSearching(false);
        const pois = poiStatus === 'complete' ? poiResult?.poiList?.pois || [] : [];
        const results = pois.map((poi: any) => makePoint(poi)).filter(Boolean) as CultureMapPoint[];
        showResults(results);
        if (!results.length) onNotice('当前位置 8 公里内暂未找到该类别地点。');
      });
    });
  }

  function addSelected() {
    if (!selected) return;
    onAddPoint({ ...selected, source: selected.source || 'user' });
    setCandidate(null);
    setSearchResults(results => results.filter(item => item.id !== selected.id));
  }

  const tripDistance = useMemo(() => points.reduce((sum, point) => sum + (Number(point.distance) || 0), 0), [points]);

  return <section className={styles.explorer}>
    <div className={styles.topBar}>
      <div><p>真实地图文化探索</p><h2>开封文化探索</h2></div>
      <form className={styles.searchBar} onSubmit={searchPois}>
        <input value={keyword} onChange={event => setKeyword(event.target.value)} placeholder="搜索景点、古建筑、博物馆、非遗、街区…" disabled={mapState !== 'ready'} />
        <button type="submit" disabled={mapState !== 'ready' || searching}>{searching ? '搜索中' : '搜索地点'}</button>
      </form>
      <div className={styles.topActions}>
        <button onClick={() => exploreNearby()} disabled={mapState !== 'ready'}>附近探索</button>
        <button onClick={() => itineraryRef.current?.scrollIntoView({ behavior: 'smooth' })}>我的行程 {points.length}</button>
        <button onClick={onAgentReplan}>Agent 重排</button>
      </div>
    </div>

    <div className={styles.categoryBar}>
      {CATEGORY_OPTIONS.map(option => <button key={option.label} className={category === option.label ? styles.categoryActive : ''} onClick={() => exploreNearby(option)} disabled={mapState !== 'ready'}>{option.label}</button>)}
      <span><i className={styles.agentDot} />Agent 推荐</span><span><i className={styles.userDot} />用户自选</span>
    </div>

    <div className={styles.mainGrid}>
      <div className={styles.mapPanel}>
        <div ref={mapContainerRef} className={styles.mapCanvas} />
        {mapState === 'missing' && <div className={styles.mapSetup}>
          <strong>真实地图尚未配置</strong>
          <p>当前不会显示静态或模拟地图。填写高德开放平台的 Web 端 JS API Key 与安全密钥后，页面将加载真实道路、POI、搜索、定位和路线规划。</p>
          <form onSubmit={saveMapConfig}>
            <label>Web 端 JS API Key<input value={keyInput} onChange={event => setKeyInput(event.target.value)} autoComplete="off" /></label>
            <label>安全密钥 securityJsCode<input type="password" value={codeInput} onChange={event => setCodeInput(event.target.value)} autoComplete="off" /></label>
            <button type="submit">保存并加载真实地图</button>
          </form>
          <a href="https://console.amap.com/dev/key/app" target="_blank" rel="noreferrer">前往高德开放平台创建 Web 端应用</a>
          {mapError && <em>{mapError}</em>}
        </div>}
        {mapState === 'loading' && <div className={styles.mapStatus}>正在连接高德真实地图…</div>}
        {mapState === 'error' && <div className={styles.mapSetup}><strong>真实地图加载失败</strong><p>{mapError}</p><button onClick={() => { localStorage.removeItem('__muling_amap_key__'); localStorage.removeItem('__muling_amap_security_code__'); window.location.reload(); }}>重新配置地图密钥</button></div>}
        {searchResults.length > 0 && <div className={styles.searchResults}>
          <header><strong>真实 POI 搜索结果</strong><button onClick={() => { setSearchResults([]); clearSearchMarkers(); }}>×</button></header>
          {searchResults.slice(0, 8).map(point => <button key={point.id} onClick={() => focusPoint(point)}><span>{point.title}</span><small>{point.kind} · {point.address || '地址由地图服务返回'}</small></button>)}
        </div>}
        <div className={styles.mapTruth}>地图与 POI 数据来自高德地图 · 支持拖动与缩放</div>
      </div>

      <aside className={styles.detailPanel}>
        {!selected ? <div className={styles.emptyDetail}>请搜索地点或点击地图上的 Marker</div> : <>
          <div className={styles.photoArea}>
            {selected.photoUrl ? <img src={selected.photoUrl} alt={selected.title + '实景图片'} /> : <div><span>景</span><small>地图服务暂未返回实景图片</small></div>}
            <b>{selected.source === 'agent' ? '木灵 Agent 推荐' : '用户自选地点'}</b>
          </div>
          <header><div><span>{selected.kind}</span><h3>{selected.title}</h3></div><em>{selected.status === 'done' ? '已完成' : selected.status === 'deferred' ? '已延期' : '待探索'}</em></header>
          <dl>
            <div><dt>地址</dt><dd>{selected.address || '等待高德 POI 返回地址'}</dd></div>
            <div><dt>距离</dt><dd>{selected.distance ? '约 ' + selected.distance + ' km' : '选择定位后计算'}</dd></div>
            <div><dt>建议停留</dt><dd>约 {selected.duration} 分钟</dd></div>
          </dl>
          <p>{selected.culture}</p>
          <div className={styles.taskBox}><div><strong>值得观察</strong><span>{selected.observe}</span></div><div><strong>素材任务</strong><span>{selected.collect}</span></div></div>
          <div className={styles.detailActions}>
            <button onClick={() => onExplain(selected)}>AI 讲解</button>
            {selectedIsInTrip ? <button onClick={() => onRemovePoint(selected.id)}>移出行程</button> : <button onClick={addSelected}>加入行程</button>}
            <button onClick={() => onPhotograph(selected)}>拍照识别</button>
            <button onClick={() => onCollect(selected)}>收藏元素</button>
            {typeof selected.lng === 'number' && typeof selected.lat === 'number' && <a href={'https://uri.amap.com/navigation?to=' + selected.lng + ',' + selected.lat + ',' + encodeURIComponent(selected.title) + '&mode=car&policy=1&src=muling&coordinate=gaode&callnative=0'} target="_blank" rel="noreferrer">开始导航</a>}
            <button className={styles.generateButton} onClick={onGenerate}>生成纪念作品</button>
          </div>
        </>}
      </aside>
    </div>

    <div className={styles.itinerary} ref={itineraryRef}>
      <header><div><p>我的行程</p><h3>我的文化探索路线</h3></div><div><strong>{routeSummary}</strong><span>地点标记距离合计约 {Math.round(tripDistance * 10) / 10} km</span></div></header>
      <div className={styles.tripList}>
        {points.map((point, index) => <article key={point.id} className={point.id === selectedId ? styles.tripActive : ''}>
          <button className={styles.tripSelect} onClick={() => { setCandidate(null); onSelect(point.id); if (mapRef.current && point.lng && point.lat) mapRef.current.setZoomAndCenter(15, [point.lng, point.lat]); }}>
            <b>{point.status === 'done' ? '✓' : index + 1}</b><span><small>{point.source === 'agent' ? 'Agent 推荐' : '用户自选'} · {point.time}</small><strong>{point.title}</strong><em>{point.kind} · 约 {point.duration} 分钟</em></span>
          </button>
          <div className={styles.tripTools}><button onClick={() => onMovePoint(point.id, -1)} disabled={index === 0} aria-label="上移">↑</button><button onClick={() => onMovePoint(point.id, 1)} disabled={index === points.length - 1} aria-label="下移">↓</button><button onClick={() => onToggleComplete(point.id)}>{point.status === 'done' ? '恢复' : '完成'}</button><button onClick={() => onRemovePoint(point.id)}>删除</button></div>
        </article>)}
      </div>
    </div>
  </section>;
}

