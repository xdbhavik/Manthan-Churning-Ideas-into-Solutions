package com.EDITH.SIH26043.service;

import com.EDITH.SIH26043.entity.CBOCoopSource;
import com.EDITH.SIH26043.entity.CSRSource;
import com.EDITH.SIH26043.entity.CompanySource;
import com.EDITH.SIH26043.entity.DepartmentSource;
import com.EDITH.SIH26043.entity.IndividualSource;
import com.EDITH.SIH26043.entity.MSMESource;
import com.EDITH.SIH26043.entity.NGOSource;
import com.EDITH.SIH26043.entity.PRISource;
import com.EDITH.SIH26043.entity.ProblemSource;
import com.EDITH.SIH26043.entity.RWASource;
import com.EDITH.SIH26043.entity.ResearchLabSource;
import com.EDITH.SIH26043.entity.SHGSource;
import com.EDITH.SIH26043.entity.StartupSource;
import com.EDITH.SIH26043.entity.ULBSource;
import com.EDITH.SIH26043.entity.UniversitySource;
import com.EDITH.SIH26043.enums.CitizenSubtype;
import com.EDITH.SIH26043.enums.CommunitySubtype;
import com.EDITH.SIH26043.enums.GovSubtype;
import com.EDITH.SIH26043.enums.HeiSubtype;
import com.EDITH.SIH26043.enums.IndustrySubtype;
import com.EDITH.SIH26043.enums.SourceBucket;
import com.EDITH.SIH26043.enums.SubEntityType;
import org.springframework.stereotype.Component;

import java.beans.BeanInfo;
import java.beans.Introspector;
import java.beans.PropertyDescriptor;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.util.HashMap;
import java.util.Map;

/**
 * Instantiates the correct 3-level JOINED subclass for a submission and maps the
 * JSON payload onto its typed columns by JavaBean property name (camelCase).
 * Payload keys without a typed column are ignored; the schema stays strict.
 */
@Component
public class SourceMapper {

    public ProblemSource materialize(SubEntityType subType, SourceBucket bucket,
                                     Map<String, Object> payload) {
        ProblemSource source = switch (subType) {
            case DEPARTMENT -> {
                DepartmentSource s = new DepartmentSource();
                s.setGovSubtype(GovSubtype.DEPARTMENT);
                yield s;
            }
            case PRI -> {
                PRISource s = new PRISource();
                s.setGovSubtype(GovSubtype.PRI);
                yield s;
            }
            case ULB -> {
                ULBSource s = new ULBSource();
                s.setGovSubtype(GovSubtype.ULB);
                yield s;
            }
            case INDIVIDUAL -> {
                IndividualSource s = new IndividualSource();
                s.setCitizenSubtype(CitizenSubtype.INDIVIDUAL);
                yield s;
            }
            case RWA -> {
                RWASource s = new RWASource();
                s.setCitizenSubtype(CitizenSubtype.RWA);
                yield s;
            }
            case COMPANY -> {
                CompanySource s = new CompanySource();
                s.setIndustrySubtype(IndustrySubtype.COMPANY);
                yield s;
            }
            case STARTUP -> {
                StartupSource s = new StartupSource();
                s.setIndustrySubtype(IndustrySubtype.STARTUP);
                yield s;
            }
            case MSME -> {
                MSMESource s = new MSMESource();
                s.setIndustrySubtype(IndustrySubtype.MSME);
                yield s;
            }
            case CSR -> {
                CSRSource s = new CSRSource();
                s.setIndustrySubtype(IndustrySubtype.CSR);
                yield s;
            }
            case NGO -> {
                NGOSource s = new NGOSource();
                s.setCommunitySubtype(CommunitySubtype.NGO);
                yield s;
            }
            case SHG -> {
                SHGSource s = new SHGSource();
                s.setCommunitySubtype(CommunitySubtype.SHG);
                yield s;
            }
            case CBO_COOP -> {
                CBOCoopSource s = new CBOCoopSource();
                s.setCommunitySubtype(CommunitySubtype.CBO_COOP);
                yield s;
            }
            case UNIVERSITY -> {
                UniversitySource s = new UniversitySource();
                s.setHeiSubtype(HeiSubtype.UNIVERSITY);
                yield s;
            }
            case RESEARCH_LAB -> {
                ResearchLabSource s = new ResearchLabSource();
                s.setHeiSubtype(HeiSubtype.RESEARCH_LAB);
                yield s;
            }
        };
        source.setBucket(bucket);
        source.setSubEntityType(subType);
        if (source.getRegisteredAt() == null) {
            source.setRegisteredAt(Instant.now());
        }
        if (payload != null) {
            apply(payload, source);
        }
        return source;
    }

    private void apply(Map<String, Object> payload, Object target) {
        try {
            BeanInfo beanInfo = Introspector.getBeanInfo(target.getClass());
            Map<String, PropertyDescriptor> props = new HashMap<>();
            for (PropertyDescriptor pd : beanInfo.getPropertyDescriptors()) {
                props.put(normalize(pd.getName()), pd);
            }
            for (Map.Entry<String, Object> e : payload.entrySet()) {
                PropertyDescriptor pd = props.get(normalize(e.getKey()));
                if (pd == null || pd.getWriteMethod() == null || e.getValue() == null) {
                    continue;
                }
                Object converted = convert(pd.getPropertyType(), e.getValue());
                if (converted != null || !pd.getPropertyType().isPrimitive()) {
                    pd.getWriteMethod().invoke(target, converted);
                }
            }
        } catch (Exception ex) {
            throw new IllegalArgumentException("Failed to map source payload", ex);
        }
    }

    private String normalize(String key) {
        return key.replace("_", "").toLowerCase();
    }

    @SuppressWarnings({"unchecked", "rawtypes"})
    private Object convert(Class<?> type, Object value) {
        if (value == null) {
            return null;
        }
        if (type.isInstance(value)) {
            return value;
        }
        if (type == String.class) {
            return value.toString();
        }
        if (type == Boolean.class || type == boolean.class) {
            return value instanceof Boolean b ? b : Boolean.parseBoolean(value.toString());
        }
        if (type == Integer.class || type == int.class) {
            return value instanceof Number n ? n.intValue() : Integer.parseInt(value.toString());
        }
        if (type == Long.class || type == long.class) {
            return value instanceof Number n ? n.longValue() : Long.parseLong(value.toString());
        }
        if (type == Double.class || type == double.class) {
            return value instanceof Number n ? n.doubleValue() : Double.parseDouble(value.toString());
        }
        if (type == BigDecimal.class) {
            return value instanceof BigDecimal bd ? bd : new BigDecimal(value.toString());
        }
        if (type == LocalDate.class) {
            return LocalDate.parse(value.toString());
        }
        if (type == LocalDateTime.class) {
            return LocalDateTime.parse(value.toString());
        }
        if (type == OffsetDateTime.class) {
            return OffsetDateTime.parse(value.toString());
        }
        if (type == Instant.class) {
            return value instanceof Instant i ? i : OffsetDateTime.parse(value.toString()).toInstant();
        }
        if (type.isEnum()) {
            return Enum.valueOf((Class<? extends Enum>) type, value.toString());
        }
        if (type == java.util.UUID.class) {
            return java.util.UUID.fromString(value.toString());
        }
        return value; // JSONB/maps pass through untouched
    }
}