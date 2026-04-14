// lib/computedColumns.ts
// Centralises SQL fragments for derived columns that should always appear
// in the detail query, regardless of user selection.  Mirrors HBX's city
// segregation and the hospital department classification.

export const BQ_CITY_GROUP_SQL = `
  CASE
    WHEN fo.is_digital_lead = TRUE                                THEN 'DIGITAL'
    WHEN fo.city IN ('CHGL','VIPU')                               THEN 'CHN'
    WHEN fo.city IN ('GGN','GZD','FDB','NOI','DLH')               THEN 'DLH-NCR'
    WHEN fo.city IN ('MOHL','CDG','PCK')                          THEN 'Tri-City'
    WHEN fo.city = 'NMB'                                          THEN 'MUM'
    ELSE fo.city
  END AS city_group`.trim();

export const BQ_DEPARTMENT_SQL = `
  CASE
    WHEN fo.order_attribution IN ('JSD','WBS','GGL','GGL-O','GGL-P','PTM')
         AND fo.order_attributed_to_role = 'Call Center Agent'
         AND c.partnership_type = 'Non-Partner Hospital'           THEN 'Digital'
    WHEN fo.order_attribution IN ('JSD','WBS','GGL','GGL-O','GGL-P','PTM')
         AND c.partnership_type = 'Partner Hospital'               THEN 'Hospital'
    WHEN fo.order_attribution IN ('RED','REDOS','NPH','SBE')
         OR REGEXP_CONTAINS(IFNULL(fo.order_attribution,''),'AIRCARGO')
                                                                   THEN 'Hospital'
    WHEN REGEXP_CONTAINS(IFNULL(fo.order_attribution,''),'REDFS')  THEN 'Field Sales'
    WHEN IFNULL(fo.order_attribution,'0') = '0'
         AND NOT REGEXP_CONTAINS(IFNULL(fo.reports_order_source_id,''),'RED')
         AND IFNULL(fo.reports_order_source_id,'0') != '0'         THEN 'Hospital'
    WHEN fo.order_attribution = 'TST'                              THEN 'Test Cases'
    ELSE 'Corporate and Others'
  END AS department`.trim();

export const HBX_CITY_GROUP_SQL = `
  CASE
    WHEN UPPER(IFNULL(fo.META_VERTICAL_TYPE_CITY_DIGITAL_SEGG_CREATED,'')) = 'DIGITAL' THEN 'DIGITAL'
    WHEN fo.META_CITY IN ('CHGL','VIPU')                          THEN 'CHN'
    WHEN fo.META_CITY IN ('GGN','GZD','FDB','NOI','DLH')          THEN 'DLH-NCR'
    WHEN fo.META_CITY IN ('MOHL','CDG','PCK')                     THEN 'Tri-City'
    WHEN fo.META_CITY = 'NMB'                                     THEN 'MUM'
    ELSE fo.META_CITY
  END AS CITY_GROUP`.trim();