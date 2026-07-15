CREATE OR REPLACE PACKAGE pkgln_automatizaciones AS
    PROCEDURE p_cargue_archivo (
        p_in_json  IN  CLOB,
        p_out_json OUT CLOB
    );

    PROCEDURE p_obtener_detalle (
        p_in_json  IN  CLOB,
        p_out_json OUT CLOB
    );

    PROCEDURE p_listar_cargues (
        p_in_json  IN  CLOB,
        p_out_json OUT CLOB
    );

    PROCEDURE p_crear_usuarios (
        p_in_json  IN  CLOB,
        p_out_json OUT CLOB
    );
END pkgln_automatizaciones;
/

CREATE OR REPLACE PACKAGE BODY pkgln_automatizaciones AS

    PROCEDURE p_cargue_archivo (
        p_in_json  IN  CLOB,
        p_out_json OUT CLOB
    ) AS
        v_nombre_archivo     VARCHAR2(100);
        v_tiene_encabezado   VARCHAR2(1);
        v_usuario            VARCHAR2(200);
        v_id_usuario         NUMBER;
        v_id_temp_cargue     NUMBER;
    BEGIN
        -- Forzar punto como separador decimal para JSON
        EXECUTE IMMEDIATE 'ALTER SESSION SET NLS_NUMERIC_CHARACTERS = ''.,''';

        -- 1. Parsear los datos de cabecera
        v_nombre_archivo   := JSON_VALUE(p_in_json, '$.nombre_archivo');
        v_tiene_encabezado := NVL(JSON_VALUE(p_in_json, '$.tiene_encabezado'), 'S');
        v_usuario          := JSON_VALUE(p_in_json, '$.usuario');

        -- 2. Resolver el ID del usuario
        BEGIN
            SELECT id INTO v_id_usuario
            FROM tkr_usuarios
            WHERE UPPER(usuario) = UPPER(v_usuario) AND ROWNUM = 1;
        EXCEPTION
            WHEN NO_DATA_FOUND THEN
                p_out_json := '{"success":false,"error":"Usuario no encontrado en la tabla tkr_usuarios."}';
                RETURN;
        END;

        -- 3. Insertar la cabecera
        INSERT INTO tkr_temp_cargue (
            nombre_archivo,
            id_usuario_cargue,
            tiene_encabezado,
            estado
        ) VALUES (
            v_nombre_archivo,
            v_id_usuario,
            v_tiene_encabezado,
            'C'
        ) RETURNING id INTO v_id_temp_cargue;

        -- 4. Insertar los detalles usando json_table
        INSERT INTO tkr_temp_detalle_cargue (
            id_temp_cargue,
            linea,
            numero_linea,
            columna_1, columna_2, columna_3, columna_4, columna_5,
            columna_6, columna_7, columna_8, columna_9, columna_10,
            columna_11, columna_12, columna_13, columna_14, columna_15,
            columna_16, columna_17, columna_18, columna_19, columna_20,
            columna_21, columna_22, columna_23, columna_24, columna_25,
            columna_26, columna_27, columna_28, columna_29, columna_30,
            columna_31, columna_32, columna_33, columna_34, columna_35,
            columna_36, columna_37, columna_38, columna_39, columna_40,
            columna_41, columna_42, columna_43, columna_44, columna_45,
            columna_46, columna_47, columna_48, columna_49, columna_50
        )
        SELECT
            v_id_temp_cargue,
            jt.linea,
            jt.numero_linea,
            jt.col_1, jt.col_2, jt.col_3, jt.col_4, jt.col_5,
            jt.col_6, jt.col_7, jt.col_8, jt.col_9, jt.col_10,
            jt.col_11, jt.col_12, jt.col_13, jt.col_14, jt.col_15,
            jt.col_16, jt.col_17, jt.col_18, jt.col_19, jt.col_20,
            jt.col_21, jt.col_22, jt.col_23, jt.col_24, jt.col_25,
            jt.col_26, jt.col_27, jt.col_28, jt.col_29, jt.col_30,
            jt.col_31, jt.col_32, jt.col_33, jt.col_34, jt.col_35,
            jt.col_36, jt.col_37, jt.col_38, jt.col_39, jt.col_40,
            jt.col_41, jt.col_42, jt.col_43, jt.col_44, jt.col_45,
            jt.col_46, jt.col_47, jt.col_48, jt.col_49, jt.col_50
        FROM JSON_TABLE(p_in_json, '$.rows[*]'
            COLUMNS (
                linea        VARCHAR2(4000) PATH '$.linea',
                numero_linea NUMBER         PATH '$.numero_linea',
                col_1        VARCHAR2(4000) PATH '$.c1',
                col_2        VARCHAR2(4000) PATH '$.c2',
                col_3        VARCHAR2(4000) PATH '$.c3',
                col_4        VARCHAR2(4000) PATH '$.c4',
                col_5        VARCHAR2(4000) PATH '$.c5',
                col_6        VARCHAR2(4000) PATH '$.c6',
                col_7        VARCHAR2(4000) PATH '$.c7',
                col_8        VARCHAR2(4000) PATH '$.c8',
                col_9        VARCHAR2(4000) PATH '$.c9',
                col_10       VARCHAR2(4000) PATH '$.c10',
                col_11       VARCHAR2(4000) PATH '$.c11',
                col_12       VARCHAR2(4000) PATH '$.c12',
                col_13       VARCHAR2(4000) PATH '$.c13',
                col_14       VARCHAR2(4000) PATH '$.c14',
                col_15       VARCHAR2(4000) PATH '$.c15',
                col_16       VARCHAR2(4000) PATH '$.c16',
                col_17       VARCHAR2(4000) PATH '$.c17',
                col_18       VARCHAR2(4000) PATH '$.c18',
                col_19       VARCHAR2(4000) PATH '$.c19',
                col_20       VARCHAR2(4000) PATH '$.c20',
                col_21       VARCHAR2(4000) PATH '$.c21',
                col_22       VARCHAR2(4000) PATH '$.c22',
                col_23       VARCHAR2(4000) PATH '$.c23',
                col_24       VARCHAR2(4000) PATH '$.c24',
                col_25       VARCHAR2(4000) PATH '$.c25',
                col_26       VARCHAR2(4000) PATH '$.c26',
                col_27       VARCHAR2(4000) PATH '$.c27',
                col_28       VARCHAR2(4000) PATH '$.c28',
                col_29       VARCHAR2(4000) PATH '$.c29',
                col_30       VARCHAR2(4000) PATH '$.c30',
                col_31       VARCHAR2(4000) PATH '$.c31',
                col_32       VARCHAR2(4000) PATH '$.c32',
                col_33       VARCHAR2(4000) PATH '$.c33',
                col_34       VARCHAR2(4000) PATH '$.c34',
                col_35       VARCHAR2(4000) PATH '$.c35',
                col_36       VARCHAR2(4000) PATH '$.c36',
                col_37       VARCHAR2(4000) PATH '$.c37',
                col_38       VARCHAR2(4000) PATH '$.c38',
                col_39       VARCHAR2(4000) PATH '$.c39',
                col_40       VARCHAR2(4000) PATH '$.c40',
                col_41       VARCHAR2(4000) PATH '$.c41',
                col_42       VARCHAR2(4000) PATH '$.c42',
                col_43       VARCHAR2(4000) PATH '$.c43',
                col_44       VARCHAR2(4000) PATH '$.c44',
                col_45       VARCHAR2(4000) PATH '$.c45',
                col_46       VARCHAR2(4000) PATH '$.c46',
                col_47       VARCHAR2(4000) PATH '$.c47',
                col_48       VARCHAR2(4000) PATH '$.c48',
                col_49       VARCHAR2(4000) PATH '$.c49',
                col_50       VARCHAR2(4000) PATH '$.c50'
            )
        ) jt;

        -- 5. Retornar éxito
        p_out_json := '{"success":true,"id_temp_cargue":' || v_id_temp_cargue || '}';
    EXCEPTION
        WHEN OTHERS THEN
            p_out_json := '{"success":false,"error":"' || SQLERRM || '"}';
    END p_cargue_archivo;

    PROCEDURE p_obtener_detalle (
        p_in_json  IN  CLOB,
        p_out_json OUT CLOB
    ) AS
        v_id_temp_cargue NUMBER;
        v_tiene_encabezado VARCHAR2(1);
    BEGIN
        v_id_temp_cargue := TO_NUMBER(JSON_VALUE(p_in_json, '$.id_temp_cargue'));

        BEGIN
            SELECT tiene_encabezado INTO v_tiene_encabezado
            FROM tkr_temp_cargue
            WHERE id = v_id_temp_cargue;
        EXCEPTION
            WHEN OTHERS THEN
                v_tiene_encabezado := 'N';
        END;

        SELECT JSON_OBJECT(
            'success' VALUE 'true',
            'rows'    VALUE (
                SELECT JSON_ARRAYAGG(
                    JSON_OBJECT(
                        'id'             VALUE d.id,
                        'linea'          VALUE d.linea,
                        'numero_linea'   VALUE d.numero_linea,
                        'id_usuario'     VALUE d.id_usuario,
                        'error'          VALUE d.error,
                        'c1'             VALUE d.columna_1,
                        'c2'             VALUE d.columna_2,
                        'c3'             VALUE d.columna_3,
                        'c4'             VALUE d.columna_4,
                        'c5'             VALUE d.columna_5,
                        'c6'             VALUE d.columna_6,
                        'c7'             VALUE d.columna_7,
                        'c8'             VALUE d.columna_8,
                        'c9'             VALUE d.columna_9,
                        'c10'            VALUE d.columna_10,
                        'c11'            VALUE d.columna_11,
                        'c12'            VALUE d.columna_12,
                        'c13'            VALUE d.columna_13,
                        'c14'            VALUE d.columna_14,
                        'c15'            VALUE d.columna_15,
                        'c16'            VALUE d.columna_16,
                        'c17'            VALUE d.columna_17,
                        'c18'            VALUE d.columna_18,
                        'c19'            VALUE d.columna_19,
                        'c20'            VALUE d.columna_20,
                        'c21'            VALUE d.columna_21,
                        'c22'            VALUE d.columna_22,
                        'c23'            VALUE d.columna_23,
                        'c24'            VALUE d.columna_24,
                        'c25'            VALUE d.columna_25,
                        'c26'            VALUE d.columna_26,
                        'c27'            VALUE d.columna_27,
                        'c28'            VALUE d.columna_28,
                        'c29'            VALUE d.columna_29,
                        'c30'            VALUE d.columna_30,
                        'c31'            VALUE d.columna_31,
                        'c32'            VALUE d.columna_32,
                        'c33'            VALUE d.columna_33,
                        'c34'            VALUE d.columna_34,
                        'c35'            VALUE d.columna_35,
                        'c36'            VALUE d.columna_36,
                        'c37'            VALUE d.columna_37,
                        'c38'            VALUE d.columna_38,
                        'c39'            VALUE d.columna_39,
                        'c40'            VALUE d.columna_40,
                        'c41'            VALUE d.columna_41,
                        'c42'            VALUE d.columna_42,
                        'c43'            VALUE d.columna_43,
                        'c44'            VALUE d.columna_44,
                        'c45'            VALUE d.columna_45,
                        'c46'            VALUE d.columna_46,
                        'c47'            VALUE d.columna_47,
                        'c48'            VALUE d.columna_48,
                        'c49'            VALUE d.columna_49,
                        'c50'            VALUE d.columna_50
                    )
                    ORDER BY d.numero_linea
                    RETURNING CLOB
                )
                FROM tkr_temp_detalle_cargue d
                WHERE d.id_temp_cargue = v_id_temp_cargue
                AND (v_tiene_encabezado = 'N' OR d.numero_linea > 1)
            )
            RETURNING CLOB
        )
        INTO p_out_json
        FROM dual;
    EXCEPTION
        WHEN OTHERS THEN
            p_out_json := '{"success":false,"error":"' || SQLERRM || '"}';
    END p_obtener_detalle;

    PROCEDURE p_listar_cargues (
        p_in_json  IN  CLOB,
        p_out_json OUT CLOB
    ) AS
    BEGIN
        SELECT JSON_OBJECT(
            'success' VALUE 'true',
            'cargues' VALUE (
                SELECT JSON_ARRAYAGG(
                    JSON_OBJECT(
                        'id'             VALUE id,
                        'nombre_archivo' VALUE nombre_archivo,
                        'fecha_cargue'   VALUE TO_CHAR(fecha_cargue, 'YYYY-MM-DD HH24:MI:SS'),
                        'tiene_encabezado' VALUE tiene_encabezado,
                        'estado'         VALUE estado,
                        'exitosos'       VALUE exitosos,
                        'errores'        VALUE errores
                    )
                    RETURNING CLOB
                )
                FROM (
                    SELECT * 
                    FROM tkr_temp_cargue 
                    ORDER BY id DESC
                )
            )
            RETURNING CLOB
        )
        INTO p_out_json
        FROM dual;
    EXCEPTION
        WHEN OTHERS THEN
            p_out_json := '{"success":false,"error":"' || SQLERRM || '"}';
    END p_listar_cargues;

    PROCEDURE p_crear_usuarios (
        p_in_json  IN  CLOB,
        p_out_json OUT CLOB
    ) AS
        v_id_temp_cargue    NUMBER;
        v_tiene_encabezado   VARCHAR2(1) := 'N';
        v_rows_inserted     NUMBER := 0;

        -- Record de mapping
        TYPE t_mapping IS RECORD (
            campo_destino    VARCHAR2(100),
            columna_origen   VARCHAR2(100),
            tipo             VARCHAR2(50),
            formato_fecha    VARCHAR2(50),
            homol_tipo       VARCHAR2(50),
            homol_constante  VARCHAR2(4000),
            homol_tabla      VARCHAR2(100),
            homol_criterio   VARCHAR2(50),
            homol_directo_js CLOB
        );
        TYPE t_mappings_list IS TABLE OF t_mapping INDEX BY BINARY_INTEGER;
        v_mappings           t_mappings_list;

        TYPE t_varchar_arr IS TABLE OF VARCHAR2(32767) INDEX BY BINARY_INTEGER;
        v_resolved_vals      t_varchar_arr;

        v_cols               VARCHAR2(32767);
        v_vals               VARCHAR2(32767);
        v_sql                VARCHAR2(32767);
        v_col_name           VARCHAR2(100);
        v_val                VARCHAR2(32767);
        v_new_val            VARCHAR2(32767);
        v_fk_id              NUMBER;

        -- Nuevas variables para control transaccional, errores y modos de carga
        v_modo_carga        VARCHAR2(50);
        v_any_error         BOOLEAN := FALSE;
        v_exitosos_count    NUMBER := 0;
        v_errores_count     NUMBER := 0;
        v_generated_id      NUMBER;
        v_total_unprocessed NUMBER := 0;
        v_total_exitosos_db NUMBER := 0;
        v_total_errores_db   NUMBER := 0;
        v_error_msg          VARCHAR2(4000);

        TYPE t_row_result IS RECORD (
            id_detalle   NUMBER,
            id_usuario   NUMBER,
            error_msg    VARCHAR2(4000)
        );
        TYPE t_results_list IS TABLE OF t_row_result INDEX BY BINARY_INTEGER;
        v_results           t_results_list;
        v_res_idx           NUMBER := 1;

        -- Helper para validar columna
        FUNCTION f_validar_col(p_col IN VARCHAR2) RETURN BOOLEAN IS
            v_num NUMBER;
        BEGIN
            IF p_col IS NULL THEN
                RETURN TRUE;
            END IF;
            IF NOT (p_col LIKE 'columna_%') THEN
                RETURN FALSE;
            END IF;
            v_num := TO_NUMBER(SUBSTR(p_col, 9));
            RETURN v_num BETWEEN 1 AND 50;
        EXCEPTION
            WHEN OTHERS THEN RETURN FALSE;
        END f_validar_col;

        -- Forward declaration para f_obtener_val_col
        FUNCTION f_obtener_val_col(
            p_col_origen IN VARCHAR2,
            p_r IN tkr_temp_detalle_cargue%ROWTYPE
        ) RETURN VARCHAR2;

        -- Helper para obtener nombre del encabezado de una columna
        FUNCTION f_obtener_nombre_columna(p_col IN VARCHAR2) RETURN VARCHAR2 IS
            v_header_val VARCHAR2(4000) := NULL;
        BEGIN
            IF v_tiene_encabezado = 'N' OR p_col IS NULL THEN
                RETURN p_col;
            END IF;
            
            DECLARE
                v_r tkr_temp_detalle_cargue%ROWTYPE;
            BEGIN
                SELECT * INTO v_r
                FROM tkr_temp_detalle_cargue
                WHERE id_temp_cargue = v_id_temp_cargue
                AND numero_linea = 1;
                
                v_header_val := f_obtener_val_col(p_col, v_r);
            EXCEPTION
                WHEN OTHERS THEN
                    v_header_val := NULL;
            END;
            
            IF v_header_val IS NOT NULL THEN
                RETURN p_col || ' ("' || v_header_val || '")';
            ELSE
                RETURN p_col;
            END IF;
        END f_obtener_nombre_columna;

        -- Helper para obtener valor de columna del registro
        FUNCTION f_obtener_val_col(
            p_col_origen IN VARCHAR2,
            p_r IN tkr_temp_detalle_cargue%ROWTYPE
        ) RETURN VARCHAR2 IS
        BEGIN
            CASE LOWER(p_col_origen)
                WHEN 'columna_1' THEN RETURN p_r.columna_1;
                WHEN 'columna_2' THEN RETURN p_r.columna_2;
                WHEN 'columna_3' THEN RETURN p_r.columna_3;
                WHEN 'columna_4' THEN RETURN p_r.columna_4;
                WHEN 'columna_5' THEN RETURN p_r.columna_5;
                WHEN 'columna_6' THEN RETURN p_r.columna_6;
                WHEN 'columna_7' THEN RETURN p_r.columna_7;
                WHEN 'columna_8' THEN RETURN p_r.columna_8;
                WHEN 'columna_9' THEN RETURN p_r.columna_9;
                WHEN 'columna_10' THEN RETURN p_r.columna_10;
                WHEN 'columna_11' THEN RETURN p_r.columna_11;
                WHEN 'columna_12' THEN RETURN p_r.columna_12;
                WHEN 'columna_13' THEN RETURN p_r.columna_13;
                WHEN 'columna_14' THEN RETURN p_r.columna_14;
                WHEN 'columna_15' THEN RETURN p_r.columna_15;
                WHEN 'columna_16' THEN RETURN p_r.columna_16;
                WHEN 'columna_17' THEN RETURN p_r.columna_17;
                WHEN 'columna_18' THEN RETURN p_r.columna_18;
                WHEN 'columna_19' THEN RETURN p_r.columna_19;
                WHEN 'columna_20' THEN RETURN p_r.columna_20;
                WHEN 'columna_21' THEN RETURN p_r.columna_21;
                WHEN 'columna_22' THEN RETURN p_r.columna_22;
                WHEN 'columna_23' THEN RETURN p_r.columna_23;
                WHEN 'columna_24' THEN RETURN p_r.columna_24;
                WHEN 'columna_25' THEN RETURN p_r.columna_25;
                WHEN 'columna_26' THEN RETURN p_r.columna_26;
                WHEN 'columna_27' THEN RETURN p_r.columna_27;
                WHEN 'columna_28' THEN RETURN p_r.columna_28;
                WHEN 'columna_29' THEN RETURN p_r.columna_29;
                WHEN 'columna_30' THEN RETURN p_r.columna_30;
                WHEN 'columna_31' THEN RETURN p_r.columna_31;
                WHEN 'columna_32' THEN RETURN p_r.columna_32;
                WHEN 'columna_33' THEN RETURN p_r.columna_33;
                WHEN 'columna_34' THEN RETURN p_r.columna_34;
                WHEN 'columna_35' THEN RETURN p_r.columna_35;
                WHEN 'columna_36' THEN RETURN p_r.columna_36;
                WHEN 'columna_37' THEN RETURN p_r.columna_37;
                WHEN 'columna_38' THEN RETURN p_r.columna_38;
                WHEN 'columna_39' THEN RETURN p_r.columna_39;
                WHEN 'columna_40' THEN RETURN p_r.columna_40;
                WHEN 'columna_41' THEN RETURN p_r.columna_41;
                WHEN 'columna_42' THEN RETURN p_r.columna_42;
                WHEN 'columna_43' THEN RETURN p_r.columna_43;
                WHEN 'columna_44' THEN RETURN p_r.columna_44;
                WHEN 'columna_45' THEN RETURN p_r.columna_45;
                WHEN 'columna_46' THEN RETURN p_r.columna_46;
                WHEN 'columna_47' THEN RETURN p_r.columna_47;
                WHEN 'columna_48' THEN RETURN p_r.columna_48;
                WHEN 'columna_49' THEN RETURN p_r.columna_49;
                WHEN 'columna_50' THEN RETURN p_r.columna_50;
                ELSE RETURN NULL;
            END CASE;
        END f_obtener_val_col;

        -- Helper para buscar en tablas foráneas
        FUNCTION f_buscar_id_tabla(
            p_tabla IN VARCHAR2,
            p_criterio IN VARCHAR2,
            p_val IN VARCHAR2
        ) RETURN NUMBER IS
            v_id NUMBER := NULL;
            v_sql VARCHAR2(1000);
            v_col_nombre VARCHAR2(100);
        BEGIN
            IF p_val IS NULL OR TRIM(p_val) IS NULL THEN
                RETURN NULL;
            END IF;

            CASE UPPER(p_tabla)
                WHEN 'TKR_CIUDADES' THEN v_col_nombre := 'NOMBRE';
                WHEN 'TKR_BARRIOS' THEN v_col_nombre := 'NOMBRE_BARRIO';
                WHEN 'TKR_PERFILES_DOCTOR' THEN v_col_nombre := 'DESCRIPCION_PERFIL';
                WHEN 'TKR_MEDIOS' THEN v_col_nombre := 'DESCRIPCION';
                WHEN 'TKR_PLANES_ASEGURADORES' THEN v_col_nombre := 'NOMBRE_ASEGURADOR';
                WHEN 'TKR_REGIMEN_ASEGURAMIENTO' THEN v_col_nombre := 'DESCRIPCION';
                WHEN 'TKR_TIPOS_IDENTIFICACION' THEN v_col_nombre := 'DESCRIPCION';
                ELSE RETURN NULL;
            END CASE;

            IF UPPER(p_criterio) = 'ID' THEN
                BEGIN
                    v_sql := 'SELECT id FROM TEKER_DEV.' || p_tabla || ' WHERE id = :1 AND ROWNUM = 1';
                    EXECUTE IMMEDIATE v_sql INTO v_id USING TO_NUMBER(p_val);
                EXCEPTION
                    WHEN OTHERS THEN v_id := NULL;
                END;
            ELSIF UPPER(p_criterio) = 'NOMBRE' OR UPPER(p_criterio) = 'DESCRIPCION' THEN
                BEGIN
                    v_sql := 'SELECT id FROM TEKER_DEV.' || p_tabla || ' WHERE UPPER(TRIM(' || v_col_nombre || ')) = UPPER(TRIM(:1)) AND ROWNUM = 1';
                    EXECUTE IMMEDIATE v_sql INTO v_id USING p_val;
                EXCEPTION
                    WHEN OTHERS THEN
                        -- Fallbacks especiales
                        IF UPPER(p_tabla) = 'TKR_CIUDADES' THEN
                            BEGIN
                                v_sql := 'SELECT id FROM TEKER_DEV.TKR_CIUDADES WHERE UPPER(TRIM(nombre_ciudad)) = UPPER(TRIM(:1)) AND ROWNUM = 1';
                                EXECUTE IMMEDIATE v_sql INTO v_id USING p_val;
                            EXCEPTION
                                WHEN OTHERS THEN v_id := NULL;
                            END;
                        ELSIF UPPER(p_tabla) = 'TKR_TIPOS_IDENTIFICACION' THEN
                            BEGIN
                                v_sql := 'SELECT id FROM TEKER_DEV.TKR_TIPOS_IDENTIFICACION WHERE UPPER(TRIM(abreviatura)) = UPPER(TRIM(:1)) AND ROWNUM = 1';
                                EXECUTE IMMEDIATE v_sql INTO v_id USING p_val;
                            EXCEPTION
                                WHEN OTHERS THEN v_id := NULL;
                            END;
                        ELSE
                            v_id := NULL;
                        END IF;
                END;
            END IF;

            RETURN v_id;
        END f_buscar_id_tabla;
    BEGIN
        EXECUTE IMMEDIATE 'ALTER SESSION SET NLS_NUMERIC_CHARACTERS = ''.,''';

        -- 1. Parsear ID de cargue y modo
        v_id_temp_cargue := TO_NUMBER(JSON_VALUE(p_in_json, '$.id_temp_cargue'));
        v_modo_carga     := NVL(JSON_VALUE(p_in_json, '$.modo_carga'), 'PARCIAL');

        -- 2. Obtener metadatos de cabecera
        BEGIN
            SELECT tiene_encabezado INTO v_tiene_encabezado
            FROM tkr_temp_cargue
            WHERE id = v_id_temp_cargue;
        EXCEPTION
            WHEN OTHERS THEN
                v_tiene_encabezado := 'N';
        END;

        -- 3. Cargar mappings
        DECLARE
            v_idx NUMBER := 1;
        BEGIN
            FOR m IN (
                SELECT *
                FROM JSON_TABLE(p_in_json, '$.mappings[*]'
                    COLUMNS (
                        campo_destino    VARCHAR2(100)  PATH '$.campo_destino',
                        columna_origen   VARCHAR2(100)  PATH '$.columna_origen',
                        tipo             VARCHAR2(50)   PATH '$.tipo',
                        formato_fecha    VARCHAR2(50)   PATH '$.formato_fecha',
                        homol_tipo       VARCHAR2(50)   PATH '$.homologacion.tipo',
                        homol_constante  VARCHAR2(4000) PATH '$.homologacion.valor_constante',
                        homol_tabla      VARCHAR2(100)  PATH '$.homologacion.tabla_destino',
                        homol_criterio   VARCHAR2(50)   PATH '$.homologacion.criterio',
                        homol_directo_js CLOB           PATH '$.homologacion.valores'
                    )
                )
            ) LOOP
                -- Validar columna_origen si existe
                IF m.columna_origen IS NOT NULL AND NOT f_validar_col(m.columna_origen) THEN
                    p_out_json := '{"success":false,"error":"Nombre de columna de origen inválido: ' || m.columna_origen || '"}';
                    RETURN;
                END IF;

                v_mappings(v_idx).campo_destino    := m.campo_destino;
                v_mappings(v_idx).columna_origen   := m.columna_origen;
                v_mappings(v_idx).tipo             := m.tipo;
                v_mappings(v_idx).formato_fecha    := NVL(m.formato_fecha, 'DD/MM/YYYY');
                v_mappings(v_idx).homol_tipo       := m.homol_tipo;
                v_mappings(v_idx).homol_constante  := m.homol_constante;
                v_mappings(v_idx).homol_tabla      := m.homol_tabla;
                v_mappings(v_idx).homol_criterio   := m.homol_criterio;
                v_mappings(v_idx).homol_directo_js := m.homol_directo_js;
                v_idx := v_idx + 1;
            END LOOP;
        END;

        -- 4. Establecer SAVEPOINT de la transacción para el modo 'TODO'
        SAVEPOINT start_batch;

        -- 5. Bucle para procesar cada fila de detalle del cargue que NO se haya creado aún
        FOR r IN (
            SELECT *
            FROM tkr_temp_detalle_cargue
            WHERE id_temp_cargue = v_id_temp_cargue
            AND (v_tiene_encabezado = 'N' OR numero_linea > 1)
            AND id_usuario IS NULL
            ORDER BY numero_linea
        ) LOOP
            -- Inicializar variables
            -- Inicializar variables
            v_cols := '';
            v_vals := '';
            v_error_msg := NULL;

            -- Evaluar cada mapping configurado y realizar pre-validación de conversiones
            BEGIN
                FOR i IN 1..v_mappings.COUNT LOOP
                    v_col_name := v_mappings(i).campo_destino;
                    v_val := NULL;

                    -- A. Obtener el valor crudo
                    IF v_mappings(i).homol_tipo = 'constante' THEN
                        v_val := v_mappings(i).homol_constante;
                    ELSIF v_mappings(i).columna_origen IS NOT NULL AND TRIM(v_mappings(i).columna_origen) IS NOT NULL THEN
                        v_val := f_obtener_val_col(v_mappings(i).columna_origen, r);
                    END IF;

                    -- B. Aplicar homologación directa
                    IF v_mappings(i).homol_tipo = 'directo' AND v_val IS NOT NULL AND v_mappings(i).homol_directo_js IS NOT NULL THEN
                        BEGIN
                            SELECT destino INTO v_new_val
                            FROM JSON_TABLE(v_mappings(i).homol_directo_js, '$[*]'
                                COLUMNS (
                                    origen  VARCHAR2(4000) PATH '$.origen',
                                    destino VARCHAR2(4000) PATH '$.destino'
                                )
                            )
                            WHERE UPPER(TRIM(origen)) = UPPER(TRIM(v_val))
                            AND ROWNUM = 1;

                            v_val := v_new_val;
                        EXCEPTION
                            WHEN NO_DATA_FOUND THEN
                                BEGIN
                                    v_val := JSON_VALUE(v_mappings(i).homol_directo_js, '$.defecto');
                                EXCEPTION
                                    WHEN OTHERS THEN NULL;
                                END;
                            WHEN OTHERS THEN
                                NULL;
                        END;
                    END IF;

                    -- C. Aplicar homologación por tabla de relación (FK)
                    IF v_mappings(i).homol_tipo = 'tabla' AND v_val IS NOT NULL AND v_mappings(i).homol_tabla IS NOT NULL THEN
                        v_fk_id := f_buscar_id_tabla(v_mappings(i).homol_tabla, v_mappings(i).homol_criterio, v_val);
                        IF v_fk_id IS NOT NULL THEN
                            v_val := TO_CHAR(v_fk_id);
                        ELSE
                            v_val := NULL;
                        END IF;
                    END IF;

                    -- D. Concatenar para la inserción con validación de tipos
                    IF v_val IS NOT NULL THEN
                        IF v_mappings(i).tipo = 'NUMBER' THEN
                            BEGIN
                                DECLARE
                                    v_dummy NUMBER;
                                BEGIN
                                    v_dummy := TO_NUMBER(v_val);
                                EXCEPTION
                                    WHEN OTHERS THEN
                                        IF v_mappings(i).columna_origen IS NOT NULL THEN
                                            RAISE_APPLICATION_ERROR(-20001, 'Error en columna [' || f_obtener_nombre_columna(v_mappings(i).columna_origen) || '] (campo de destino: ' || v_mappings(i).campo_destino || '): El valor "' || v_val || '" no es un número válido.');
                                        ELSE
                                            RAISE_APPLICATION_ERROR(-20001, 'Error en campo de destino [' || v_mappings(i).campo_destino || '] (valor constante): El valor "' || v_val || '" no es un número válido.');
                                        END IF;
                                END;
                                v_cols := v_cols || v_col_name || ', ';
                                v_vals := v_vals || 'TO_NUMBER(''' || REPLACE(v_val, '''', '''''''') || '''), ';
                            END;
                        ELSIF v_mappings(i).tipo = 'DATE' THEN
                            BEGIN
                                DECLARE
                                    v_dummy DATE;
                                BEGIN
                                    v_dummy := TO_DATE(v_val, v_mappings(i).formato_fecha);
                                EXCEPTION
                                    WHEN OTHERS THEN
                                        IF v_mappings(i).columna_origen IS NOT NULL THEN
                                            RAISE_APPLICATION_ERROR(-20002, 'Error en columna [' || f_obtener_nombre_columna(v_mappings(i).columna_origen) || '] (campo de destino: ' || v_mappings(i).campo_destino || '): El valor "' || v_val || '" no es una fecha válida con formato ' || v_mappings(i).formato_fecha || '.');
                                        ELSE
                                            RAISE_APPLICATION_ERROR(-20002, 'Error en campo de destino [' || v_mappings(i).campo_destino || '] (valor constante): El valor "' || v_val || '" no es una fecha válida con formato ' || v_mappings(i).formato_fecha || '.');
                                        END IF;
                                END;
                                v_cols := v_cols || v_col_name || ', ';
                                v_vals := v_vals || 'TO_DATE(''' || REPLACE(v_val, '''', '''''''') || ''', ''' || v_mappings(i).formato_fecha || '''), ';
                            END;
                        ELSE
                            v_cols := v_cols || v_col_name || ', ';
                            v_vals := v_vals || '''' || REPLACE(v_val, '''', '''''''') || ''', ';
                        END IF;
                    END IF;
                END LOOP;

                -- Realizar el INSERT dinámico si hay columnas válidas mapeadas
                IF LENGTH(v_cols) > 0 THEN
                    v_cols := SUBSTR(v_cols, 1, LENGTH(v_cols) - 2);
                    v_vals := SUBSTR(v_vals, 1, LENGTH(v_vals) - 2);

                    v_sql := 'INSERT INTO TEKER_DEV.TKR_USUARIOS (' || v_cols || ') VALUES (' || v_vals || ') RETURNING id INTO :1';
                    BEGIN
                        EXECUTE IMMEDIATE v_sql USING OUT v_generated_id;
                        
                        -- Registrar resultado exitoso temporalmente en la colección
                        v_results(v_res_idx).id_detalle := r.id;
                        v_results(v_res_idx).id_usuario := v_generated_id;
                        v_results(v_res_idx).error_msg  := NULL;
                        v_exitosos_count := v_exitosos_count + 1;
                    EXCEPTION
                        WHEN OTHERS THEN
                            v_any_error := TRUE;
                            v_results(v_res_idx).id_detalle := r.id;
                            v_results(v_res_idx).id_usuario := NULL;
                            
                            -- Parsear el error de base de datos para intentar determinar la columna en caso de restricciones conocidas
                            DECLARE
                                v_err_msg VARCHAR2(4000) := SQLERRM;
                            BEGIN
                                IF v_err_msg LIKE '%TKR_USUARIOS_IDX_1%' OR v_err_msg LIKE '%USUARIO%' THEN
                                    -- Buscar el mapping de usuario
                                    DECLARE
                                        v_found BOOLEAN := FALSE;
                                    BEGIN
                                        FOR k IN 1..v_mappings.COUNT LOOP
                                            IF UPPER(v_mappings(k).campo_destino) = 'USUARIO' THEN
                                                v_found := TRUE;
                                                IF v_mappings(k).columna_origen IS NOT NULL THEN
                                                    v_results(v_res_idx).error_msg := 'Error en columna [' || f_obtener_nombre_columna(v_mappings(k).columna_origen) || '] (campo de destino: usuario): El nombre de usuario ya existe (restricción única).';
                                                ELSE
                                                    v_results(v_res_idx).error_msg := 'Error en campo de destino [usuario] (valor constante): El nombre de usuario ya existe (restricción única).';
                                                END IF;
                                                EXIT;
                                            END IF;
                                        END LOOP;
                                        IF NOT v_found THEN
                                            v_results(v_res_idx).error_msg := 'Error en campo de destino [usuario]: El nombre de usuario ya existe (restricción única).';
                                        END IF;
                                    END;
                                ELSIF v_err_msg LIKE '%ORA-01400%' THEN
                                    -- Extraer el nombre de la columna entre las últimas comillas dobles
                                    DECLARE
                                        v_col VARCHAR2(100);
                                        v_last_quote NUMBER;
                                        v_prev_quote NUMBER;
                                        v_found BOOLEAN := FALSE;
                                    BEGIN
                                        v_last_quote := INSTR(v_err_msg, '"', -1);
                                        v_prev_quote := INSTR(v_err_msg, '"', -1, 2);
                                        v_col := SUBSTR(v_err_msg, v_prev_quote + 1, v_last_quote - v_prev_quote - 1);
                                        
                                        FOR k IN 1..v_mappings.COUNT LOOP
                                            IF UPPER(v_mappings(k).campo_destino) = UPPER(v_col) THEN
                                                v_found := TRUE;
                                                IF v_mappings(k).columna_origen IS NOT NULL THEN
                                                    v_results(v_res_idx).error_msg := 'Error en columna [' || f_obtener_nombre_columna(v_mappings(k).columna_origen) || '] (campo de destino: ' || v_mappings(k).campo_destino || '): El valor no puede ser nulo (campo obligatorio).';
                                                ELSE
                                                    v_results(v_res_idx).error_msg := 'Error en campo de destino [' || v_mappings(k).campo_destino || '] (valor constante): El valor no puede ser nulo (campo obligatorio).';
                                                END IF;
                                                EXIT;
                                            END IF;
                                        END LOOP;
                                        IF NOT v_found THEN
                                            v_results(v_res_idx).error_msg := 'Error en columna [' || v_col || ']: El valor no puede ser nulo (campo obligatorio).';
                                        END IF;
                                    EXCEPTION
                                        WHEN OTHERS THEN
                                            v_results(v_res_idx).error_msg := SUBSTR(v_err_msg, 1, 4000);
                                    END;
                                ELSIF v_err_msg LIKE '%SYS_C%' OR v_err_msg LIKE '%UNIQUE%' OR v_err_msg LIKE '%RESTRICCIÓN ÚNICA%' THEN
                                    v_results(v_res_idx).error_msg := 'Error por valor duplicado (restricción única) en registro de inserción. (' || SUBSTR(v_err_msg, 1, 300) || ')';
                                ELSE
                                    v_results(v_res_idx).error_msg := SUBSTR(v_err_msg, 1, 4000);
                                END IF;
                            END;
                            v_errores_count := v_errores_count + 1;
                    END;
                    v_res_idx := v_res_idx + 1;
                END IF;
            EXCEPTION
                WHEN OTHERS THEN
                    -- Capturar errores personalizados levantados con RAISE_APPLICATION_ERROR
                    v_any_error := TRUE;
                    v_results(v_res_idx).id_detalle := r.id;
                    v_results(v_res_idx).id_usuario := NULL;
                    
                    -- SQLERRM tendrá el formato "ORA-20001: Error en columna [X]: ..."
                    -- Vamos a limpiar el prefijo "ORA-2000X: " para mostrar un mensaje más amigable
                    DECLARE
                        v_err_msg VARCHAR2(4000) := SQLERRM;
                        v_colon_pos NUMBER;
                    BEGIN
                        v_colon_pos := INSTR(v_err_msg, ':', 1, 2);
                        IF v_colon_pos > 0 THEN
                            v_results(v_res_idx).error_msg := TRIM(SUBSTR(v_err_msg, v_colon_pos + 1));
                        ELSE
                            v_results(v_res_idx).error_msg := SUBSTR(v_err_msg, 1, 4000);
                        END IF;
                    END;
                    v_errores_count := v_errores_count + 1;
                    v_res_idx := v_res_idx + 1;
            END;
        END LOOP;

        -- 6. Aplicar control transaccional según el resultado y el modo
        IF v_modo_carga = 'TODO' AND v_any_error THEN
            -- Rollback completo de inserciones en tkr_usuarios
            ROLLBACK TO start_batch;
            
            -- Guardar los errores en tkr_temp_detalle_cargue, pero id_usuario a NULL
            FOR j IN 1..v_results.COUNT LOOP
                UPDATE tkr_temp_detalle_cargue
                SET error = v_results(j).error_msg,
                    id_usuario = NULL
                WHERE id = v_results(j).id_detalle;
            END LOOP;
        ELSE
            -- En modo parcial, o modo 'TODO' sin errores, guardamos los usuarios reales
            FOR j IN 1..v_results.COUNT LOOP
                UPDATE tkr_temp_detalle_cargue
                SET id_usuario = v_results(j).id_usuario,
                    error = v_results(j).error_msg
                WHERE id = v_results(j).id_detalle;
            END LOOP;
        END IF;

        -- 7. Recopilar métricas de la base de datos para la cabecera
        SELECT COUNT(*) INTO v_total_exitosos_db
        FROM tkr_temp_detalle_cargue
        WHERE id_temp_cargue = v_id_temp_cargue
        AND id_usuario IS NOT NULL;

        SELECT COUNT(*) INTO v_total_errores_db
        FROM tkr_temp_detalle_cargue
        WHERE id_temp_cargue = v_id_temp_cargue
        AND error IS NOT NULL;

        SELECT COUNT(*) INTO v_total_unprocessed
        FROM tkr_temp_detalle_cargue
        WHERE id_temp_cargue = v_id_temp_cargue
        AND (v_tiene_encabezado = 'N' OR numero_linea > 1)
        AND id_usuario IS NULL;

        -- Actualizar la cabecera del cargue
        IF v_total_unprocessed = 0 AND v_total_errores_db = 0 THEN
            -- Exito total: Cambiar a Procesado ('P')
            UPDATE tkr_temp_cargue
            SET estado = 'P',
                exitosos = v_total_exitosos_db,
                errores = v_total_errores_db
            WHERE id = v_id_temp_cargue;
        ELSE
            -- Quedan pendientes o errores: Mantener estado actual
            UPDATE tkr_temp_cargue
            SET exitosos = v_total_exitosos_db,
                errores = v_total_errores_db
            WHERE id = v_id_temp_cargue;
        END IF;

        COMMIT;

        -- Retornar el informe detallado en formato JSON
        p_out_json := '{"success":true,"rows_processed":' || v_results.COUNT ||
                      ',"exitosos":' || v_total_exitosos_db ||
                      ',"errores":' || v_total_errores_db ||
                      ',"any_error":' || CASE WHEN v_any_error THEN 'true' ELSE 'false' END || '}';

    EXCEPTION
        WHEN OTHERS THEN
            ROLLBACK;
            p_out_json := '{"success":false,"error":"' || REPLACE(SQLERRM, '"', '\"') || '"}';
    END p_crear_usuarios;

END pkgln_automatizaciones;
/
