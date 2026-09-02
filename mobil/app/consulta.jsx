// app/consulta.jsx
// HRPA - Consulta de Turnos - VERSIÓN FINAL AJUSTADA
import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, FlatList, StyleSheet,
  ActivityIndicator, TextInput, ScrollView, Dimensions
} from 'react-native';
import { useRouter } from 'expo-router';
import { X, Search, User, MapPin, Clock, Eye, ChevronLeft, ChevronRight } from 'lucide-react-native';
import { sheetsService } from '../src/services/sheets';
import { COLOR_PRIMARIO, MESES, TURNO_MAP, DEFAULT_GOOGLE_CONFIG } from '../src/constants/config';

const { width } = Dimensions.get('window');
const PADDING = 16;
const GAP = 3;
const CELL = Math.floor((width - PADDING * 2 - GAP * 6) / 7);
const DIAS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

export default function ConsultaScreen() {
  const router = useRouter();
  const [personal, setPersonal] = useState([]);
  const [turnosPersona, setTurnosPersona] = useState({});
  const [busqueda, setBusqueda] = useState('');
  const [cargando, setCargando] = useState(true);
  const [personaSel, setPersonaSel] = useState(null);
  const [hojasList, setHojasList] = useState([]);
  const [selectorAbierto, setSelectorAbierto] = useState(false);

  const [mes, setMes] = useState(() => {
    const hoja = (DEFAULT_GOOGLE_CONFIG.sheetName || 'AGOSTO').toUpperCase();
    const mapa = { ENERO:1, FEBRERO:2, MARZO:3, ABRIL:4, MAYO:5, JUNIO:6, JULIO:7, AGOSTO:8, SEPTIEMBRE:9, OCTUBRE:10, NOVIEMBRE:11, DICIEMBRE:12 };
    return mapa[hoja] || 8;
  });
  const [anio, setAnio] = useState(new Date().getFullYear());
  const [hojaSel, setHojaSel] = useState(DEFAULT_GOOGLE_CONFIG.sheetName || 'AGOSTO');

  useEffect(() => {
    (async () => {
      try {
        const hojas = await sheetsService.obtenerHojas();
        setHojasList(hojas);
      } catch (e) {}
      try {
        const mesActivo = await sheetsService.obtenerMesActivo();
        const mapa = { ENERO:1, FEBRERO:2, MARZO:3, ABRIL:4, MAYO:5, JUNIO:6, JULIO:7, AGOSTO:8, SEPTIEMBRE:9, OCTUBRE:10, NOVIEMBRE:11, DICIEMBRE:12 };
        const m = mapa[mesActivo.toUpperCase()];
        if (m) { setMes(m); setHojaSel(mesActivo); }
      } catch (e) {}
    })();
  }, []);

  useEffect(() => {
    if (hojaSel) cargarDatos(hojaSel, mes, anio);
  }, [hojaSel, mes, anio]);

  const totalDias = new Date(anio, mes, 0).getDate();
  const primerDiaReal = new Date(anio, mes - 1, 1).getDay();
  const primerDiaLunes = primerDiaReal === 0 ? 6 : primerDiaReal - 1;
  const totalSemanas = Math.ceil((totalDias + primerDiaLunes) / 7);

  const UA = (m, a) => {
    const mapa = { ENERO:1, FEBRERO:2, MARZO:3, ABRIL:4, MAYO:5, JUNIO:6, JULIO:7, AGOSTO:8, SEPTIEMBRE:9, OCTUBRE:10, NOVIEMBRE:11, DICIEMBRE:12 };
    const sigla = MESES[m - 1]?.toUpperCase()?.substring(0, 5) || '';
    const hoja = (hojasList || []).find(h => String(h).toUpperCase().includes(sigla)) || (hojasList || []).find(h => String(h).toUpperCase().includes(mapa[m] ? MESES[m - 1].toUpperCase() : '')) || MESES[m - 1].toUpperCase();
    return { hoja, mes: m, anio: a };
  };

  const cargarDatos = async (hoja = hojaSel, m = mes, a = anio) => {
    setCargando(true);
    try {
      const data = await sheetsService.cargarPersonal(hoja, m, a);
      setPersonal(data);
      const t = {};
      data.forEach(e => { t[e.id] = {}; e.turnos.forEach((x, i) => { t[e.id][i+1] = x; }); });
      setTurnosPersona(t);
    } catch (e) {} finally { setCargando(false); }
  };

  const personalFiltrado = busqueda
    ? personal.filter(p => p.nombre.toLowerCase().includes(busqueda.toLowerCase()) || p.grado.toLowerCase().includes(busqueda.toLowerCase()) || (p.dni || '').includes(busqueda))
    : personal.slice(0, 30);

  const getHorasMes = (empId) => {
    let h = 0;
    for (let d = 1; d <= totalDias; d++) {
      const c = turnosPersona[empId]?.[d] || '';
      if (TURNO_MAP[c]?.horas) h += TURNO_MAP[c].horas;
    }
    return h;
  };

  if (cargando) return <View style={s.center}><ActivityIndicator size="large" color={COLOR_PRIMARIO} /></View>;

  if (personaSel) {
    const horasMes = getHorasMes(personaSel.id);
    const turnosUsados = [...new Set(Array.from({length: totalDias}, (_, i) => turnosPersona[personaSel.id]?.[i+1]).filter(Boolean))];

    return (
      <View style={s.container}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => setPersonaSel(null)}><X size={22} color="#FFF" /></TouchableOpacity>
          <View style={{flex:1, marginLeft:10}}>
            <Text style={s.hGrado}>{personaSel.grado}</Text>
            <Text style={s.hNombre}>{personaSel.nombre}</Text>
            <View style={s.hAreaRow}><MapPin size={12} color="rgba(255,255,255,0.6)" /><Text style={s.hArea}>{personaSel.area}</Text></View>
          </View>
        </View>

        <ScrollView>
          {/* KPIs */}
          <View style={s.kpiRow}>
            <View style={s.kpi}><Text style={s.kpiNum}>{horasMes}h</Text><Text style={s.kpiSub}>Horas</Text></View>
            <View style={s.kpi}><Text style={s.kpiNum}>{turnosUsados.length}</Text><Text style={s.kpiSub}>Turnos</Text></View>
            <View style={s.kpi}><Text style={s.kpiNum}>{totalDias}</Text><Text style={s.kpiSub}>Días</Text></View>
          </View>

          {/* CALENDARIO */}
          <View style={s.calBox}>
            <View style={s.calTop}>
              <Text style={s.calMes}>{MESES[mes-1]} {anio}</Text>
              <View style={s.calDiasRow}>
                {DIAS.map((d, i) => (
                  <View key={i} style={[s.calDiaH, i===5||i===6 ? {} : {}]}>
                    <Text style={[s.calDiaHT, (i===5||i===6)&&{color:'rgba(255,255,255,0.6)'}]}>{d}</Text>
                  </View>
                ))}
              </View>
            </View>

            <View style={s.calGrid}>
              {Array.from({length: totalSemanas}).map((_, wi) => {
                let diaNum = wi * 7 - primerDiaLunes + 1;
                return (
                  <View key={wi} style={s.calRow}>
                    {Array.from({length: 7}).map((_, di) => {
                      const vacio = diaNum < 1 || diaNum > totalDias;
                      const codigo = vacio ? '' : (turnosPersona[personaSel.id]?.[diaNum] || '');
                      const turno = TURNO_MAP[codigo];
                      const actual = diaNum;
                      diaNum++;
                      return (
                        <View key={di} style={s.calCell}>
                          {!vacio && (
                            <View style={[s.calDiaBox, turno ? {backgroundColor: turno.color} : {backgroundColor:'#F1F5F9'}]}>
                              <Text style={[s.calDiaNum, turno ? {color: turno.texto} : {color:'#94A3B8'}]}>{actual}</Text>
                              <Text style={[s.calDiaTurno, turno ? {color: turno.texto} : {color:'#CBD5E1'}]} numberOfLines={1}>{codigo||'·'}</Text>
                            </View>
                          )}
                        </View>
                      );
                    })}
                  </View>
                );
              })}
            </View>
          </View>

          {/* LEYENDA */}
          <View style={s.leyBox}>
            <Text style={s.leyTit}>Leyenda</Text>
            <View style={s.leyGrid}>
              {Object.entries(TURNO_MAP).map(([codigo, turno]) => (
                <View key={codigo} style={s.leyItem}>
                  <View style={[s.leyDot, {backgroundColor: turno.color}]} />
                  <Text style={s.leyText}>{codigo} = {turno.nombre}</Text>
                </View>
              ))}
            </View>
          </View>
          <View style={{height:40}}/>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={()=>router.back()}><X size={22} color="#FFF"/></TouchableOpacity>
        <Eye size={20} color="#FFF"/>
        <Text style={s.headerTitle}>Consultar Turnos</Text>
      </View>
      <View style={s.selectorRow}>
        <TouchableOpacity style={s.selectorBtn} onPress={() => setSelectorAbierto(o => !o)} activeOpacity={0.8}>
          <Text style={s.selectorBtnText}>{selectorAbierto ? '▼' : '▽'} {MESES[mes-1]} {anio} · {hojaSel}</Text>
        </TouchableOpacity>
      </View>
      {selectorAbierto && (
        <View style={s.selectorPanel}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingVertical: 4 }}>
            {hojasList.map(h => {
              const activa = h === hojaSel;
              return (
                <TouchableOpacity key={h} onPress={() => { setHojaSel(h); setSelectorAbierto(false); }} style={[s.hojaChip, activa && s.hojaChipActive]}>
                  <Text style={[s.hojaChipText, activa && s.hojaChipTextActive]}>{h.replace(/\s+\d+$/, '')}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          <View style={s.selectorMesRow}>
            <TouchableOpacity style={s.mesBtn} onPress={() => { const u = UA(mes === 1 ? 12 : mes - 1, mes === 1 ? anio - 1 : anio); setMes(u.mes); setAnio(u.anio); setHojaSel(u.hoja); }}><ChevronLeft size={16} color="#FFF" /></TouchableOpacity>
            <Text style={s.mesText}>{MESES[mes-1]} {anio}</Text>
            <TouchableOpacity style={s.mesBtn} onPress={() => { const u = UA(mes === 12 ? 1 : mes + 1, mes === 12 ? anio + 1 : anio); setMes(u.mes); setAnio(u.anio); setHojaSel(u.hoja); }}><ChevronRight size={16} color="#FFF" /></TouchableOpacity>
          </View>
        </View>
      )}
      <View style={s.searchBox}>
        <Search size={18} color="#94A3B8"/>
        <TextInput style={s.searchIn} value={busqueda} onChangeText={setBusqueda} placeholder="Buscar..." placeholderTextColor="#94A3B8"/>
        {busqueda ? <TouchableOpacity onPress={()=>setBusqueda('')}><X size={18} color="#94A3B8"/></TouchableOpacity> : null}
      </View>
      <FlatList
        data={personalFiltrado}
        keyExtractor={i=>i.id.toString()}
        contentContainerStyle={{padding:12, gap:8}}
        renderItem={({item})=>(
          <TouchableOpacity style={s.card} onPress={()=>setPersonaSel(item)}>
            <View style={s.avatar}><User size={24} color="#64748B"/></View>
            <View style={{flex:1}}>
              <Text style={s.cardGrado}>{item.grado}</Text>
              <Text style={s.cardNombre}>{item.nombre}</Text>
              <View style={{flexDirection:'row',gap:8,marginTop:4}}>
                <Text style={{fontSize:11,color:'#94A3B8'}}>{item.area}</Text>
                <Text style={{fontSize:11,color:'#94A3B8'}}>{getHorasMes(item.id)}h</Text>
              </View>
            </View>
            <ChevronLeft size={20} color="#D1D5DB" style={{transform:[{rotate:'180deg'}]}}/>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container:{flex:1,backgroundColor:'#F8FAFC'},
  center:{flex:1,justifyContent:'center',alignItems:'center'},
  header:{backgroundColor:COLOR_PRIMARIO,flexDirection:'row',alignItems:'center',padding:14,paddingTop:50,gap:10},
  headerTitle:{fontSize:18,fontWeight:'700',color:'#FFF',flex:1},
  hGrado:{fontSize:11,fontWeight:'600',color:'rgba(255,255,255,0.7)',textTransform:'uppercase'},
  hNombre:{fontSize:16,fontWeight:'700',color:'#FFF'},
  hAreaRow:{flexDirection:'row',alignItems:'center',marginTop:4,gap:4},
  hArea:{fontSize:12,color:'rgba(255,255,255,0.7)'},
  
  searchBox:{flexDirection:'row',alignItems:'center',margin:12,backgroundColor:'#FFF',borderRadius:14,paddingHorizontal:14,height:48,borderWidth:1,borderColor:'#E2E8F0',gap:10},
  searchIn:{flex:1,fontSize:14,color:'#334155'},

  selectorRow:{paddingHorizontal:12,paddingTop:10},
  selectorBtn:{alignSelf:'flex-start',backgroundColor:'#FFF',borderRadius:20,paddingHorizontal:12,paddingVertical:6,borderWidth:1,borderColor:'#E2E8F0'},
  selectorBtnText:{fontSize:12,color:COLOR_PRIMARIO,fontWeight:'700'},
  selectorPanel:{backgroundColor:'#FFF',marginHorizontal:12,marginTop:8,borderRadius:14,padding:10,borderWidth:1,borderColor:'#E2E8F0',gap:8},
  hojaChip:{backgroundColor:'#F8FAFC',paddingHorizontal:10,paddingVertical:6,borderRadius:20,borderWidth:1,borderColor:'#E2E8F0'},
  hojaChipActive:{backgroundColor:COLOR_PRIMARIO,borderColor:COLOR_PRIMARIO},
  hojaChipText:{fontSize:11,color:'#64748B',fontWeight:'600'},
  hojaChipTextActive:{color:'#FFF',fontWeight:'800'},
  selectorMesRow:{flexDirection:'row',alignItems:'center',justifyContent:'space-between'},
  mesBtn:{backgroundColor:COLOR_PRIMARIO,width:32,height:32,borderRadius:10,alignItems:'center',justifyContent:'center'},
  mesText:{fontSize:13,fontWeight:'700',color:'#1E293B'},
  
  card:{flexDirection:'row',alignItems:'center',backgroundColor:'#FFF',borderRadius:16,padding:14,gap:12},
  avatar:{width:48,height:48,borderRadius:16,backgroundColor:'#F1F5F9',alignItems:'center',justifyContent:'center'},
  cardGrado:{fontSize:10,fontWeight:'700',color:'#64748B',textTransform:'uppercase'},
  cardNombre:{fontSize:14,fontWeight:'700',color:'#1E293B'},
  
  kpiRow:{flexDirection:'row',padding:16,gap:8},
  kpi:{flex:1,backgroundColor:'#FFF',borderRadius:14,padding:14,alignItems:'center'},
  kpiNum:{fontSize:22,fontWeight:'800',color:COLOR_PRIMARIO},
  kpiSub:{fontSize:10,color:'#94A3B8',marginTop:2},
  
  calBox:{backgroundColor:'#FFF',marginHorizontal:PADDING,borderRadius:20,overflow:'hidden',marginTop:4},
  calTop:{backgroundColor:COLOR_PRIMARIO,paddingTop:14,paddingBottom:10,paddingHorizontal:12},
  calMes:{fontSize:16,fontWeight:'800',color:'#FFF',textAlign:'center',marginBottom:10},
  calDiasRow:{flexDirection:'row'},
  calDiaH:{width:CELL,alignItems:'center'},
  calDiaHT:{fontSize:12,fontWeight:'700',color:'#FFF'},
  calGrid:{paddingHorizontal:12,paddingVertical:10},
  calRow:{flexDirection:'row'},
  calCell:{width:CELL,alignItems:'center',paddingVertical:2},
  calDiaBox:{width:CELL-4,borderRadius:8,alignItems:'center',justifyContent:'center',paddingVertical:8},
  calDiaNum:{fontSize:13,fontWeight:'600'},
  calDiaTurno:{fontSize:9,fontWeight:'700',marginTop:2,textAlign:'center'},
  
  leyBox:{backgroundColor:'#FFF',marginHorizontal:PADDING,marginTop:16,borderRadius:16,padding:14},
  leyTit:{fontSize:12,fontWeight:'700',color:'#1E293B',marginBottom:10},
  leyGrid:{flexDirection:'row',flexWrap:'wrap'},
  leyItem:{flexDirection:'row',alignItems:'center',width:'50%',paddingVertical:3,gap:6},
  leyDot:{width:12,height:12,borderRadius:3},
  leyText:{fontSize:10,color:'#475569'},
});