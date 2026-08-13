import { memo } from 'react';
import { ArrowLeft, ArrowRight, ExternalLink, Gift, PlayCircle } from 'lucide-react';
import type { Branch, Course, CurrencyCode, Language } from '../types';
import { CourseIcon } from './CourseIcon';

type Props={course:Course;lang:Language;branch:Branch;currency:CurrencyCode;rate:number;usdtRate:number|null;text:Record<string,string>;onOrder:(course:Course)=>void};
export function formatMoney(value:number,currency:CurrencyCode|'USDT',lang:Language){const maximumFractionDigits=currency==='USDT'?2:['KWD','JOD','BHD','OMR'].includes(currency)?3:currency==='LBP'||currency==='SDG'?0:2;return new Intl.NumberFormat(lang==='ar'?'ar-EG':'en-US',{maximumFractionDigits}).format(value)}
function shortDescription(course:Course,text:Record<string,string>){if(course.description)return course.description;if(course.title)return `${course.title}. ${text.descriptionSyncingShort}`;return text.descriptionUnavailable}

export const CourseCard=memo(function CourseCard({course,lang,branch,currency,rate,usdtRate,text,onOrder}:Props){
  const converted=course.priceEgp*rate; const usdt=usdtRate?course.priceEgp*usdtRate:null; const Arrow=lang==='ar'?ArrowLeft:ArrowRight; const description=shortDescription(course,text); const onsite=Boolean(course.onsite); const international=branch.code!=='EG'; const resourceCount=(course.studyFiles?.length||0)+(course.studyVideoUrl?1:0);
  return <article className={`course-card ${onsite?'onsite-course-card':''}`}>
    <div className="course-card-head"><div className="course-heading-copy"><div className="course-code-line"><span className="course-icon"><CourseIcon name={course.icon} size={17}/></span><h3 dir="ltr">{course.code}</h3></div><p className={`course-title ${course.title?'':'unresolved'}`} title={course.title||text.titleUnavailable}>{course.title||text.titleUnavailable}</p><span className="course-faculty">{lang==='ar'?course.facultyAr:course.faculty}</span></div><span className={`tma-badge ${onsite?'onsite-badge':''}`}>{onsite?text.onsiteExam:course.type}</span></div>
    <p className={`course-description ${course.description?'':'pending'}`} title={description}>{description}</p>
    {course.descriptionSource&&course.description&&<a className="course-source" href={course.descriptionSource} target="_blank" rel="noreferrer"><ExternalLink size={12}/><span>{text.aouSource}</span></a>}
    {onsite&&<div className="onsite-resource-preview"><PlayCircle size={15}/><span>{resourceCount>0?`${resourceCount} ${text.studyResources}`:text.studyResourcesIncluded}</span></div>}
    <div className="card-divider"/><div className="course-meta"><div><small>{text.semester}</small><strong>{course.semester.replace('2025/2026','25/26')}</strong></div><div><small>{text.service}</small><strong>{onsite?text.freeStudyPack:text.tmaSupport}</strong></div></div>
    <div className="course-footer"><div className={`price-block ${onsite?'free-price-block':''}`}><small>{onsite?text.claimPrice:text.startsFrom}</small>{onsite?<strong className="free-price"><Gift size={17}/> {text.free}</strong>:<><strong>{formatMoney(converted,currency,lang)} <em>{currency}</em></strong>{international&&<span className="usdt-quote">{usdt?`≈ ${formatMoney(usdt,'USDT',lang)} USDT`:text.usdtRateUnavailable}</span>}</>}</div><button className={onsite?'claim-free-button':'primary-button'} type="button" onClick={()=>onOrder(course)}><span>{onsite?text.claimFree:text.orderNow}</span><Arrow size={15}/></button></div>
  </article>;
});
