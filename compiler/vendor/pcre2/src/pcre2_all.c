/*
 * PCRE2 Amalgamation - Single compilation unit for PCRE2 8-bit library
 * 
 * This file includes all necessary PCRE2 source files for building the
 * 8-bit variant (PCRE2_CODE_UNIT_WIDTH=8) used by GoodScript.
 * 
 * Based on PCRE2 10.47 (https://github.com/PCRE2Project/pcre2)
 * License: BSD 3-clause with PCRE2 exception (see ../LICENSE)
 * 
 * Compilation:
 *   cc -O2 -DPCRE2_CODE_UNIT_WIDTH=8 -DHAVE_CONFIG_H -DPCRE2_STATIC -c pcre2_all.c -o pcre2.o
 * 
 * Note: JIT support is disabled (requires sljit dependency).
 * The interpreter-based matcher is fast enough for GoodScript's use cases.
 */

/* Required for PCRE2 source files */
#define PCRE2_CODE_UNIT_WIDTH 8
#define HAVE_CONFIG_H 1
#define PCRE2_STATIC 1

/* Rename config.h.generic to config.h and pcre2.h.generic to pcre2.h for includes */
/* We handle this by ensuring the source directory is in the include path */

/* Include all PCRE2 8-bit source files */
#include "pcre2_auto_possess.c"
#include "pcre2_chkdint.c"
#include "pcre2_compile.c"
#include "pcre2_compile_cgroup.c"
#include "pcre2_compile_class.c"
#include "pcre2_config.c"
#include "pcre2_context.c"
#include "pcre2_convert.c"
#include "pcre2_dfa_match.c"
#include "pcre2_error.c"
#include "pcre2_extuni.c"
#include "pcre2_find_bracket.c"
#include "pcre2_jit_compile.c"       /* Contains dummy functions when JIT disabled */
#include "pcre2_maketables.c"
#include "pcre2_match.c"
#include "pcre2_match_data.c"
#include "pcre2_match_next.c"
#include "pcre2_newline.c"
#include "pcre2_ord2utf.c"
#include "pcre2_pattern_info.c"
#include "pcre2_script_run.c"
#include "pcre2_serialize.c"
#include "pcre2_string_utils.c"
#include "pcre2_study.c"
#include "pcre2_substitute.c"
#include "pcre2_substring.c"
#include "pcre2_tables.c"
#include "pcre2_ucd.c"
#include "pcre2_valid_utf.c"
#include "pcre2_xclass.c"

/* Note: pcre2_chartables.c is NOT included here.
 * We use the pre-generated pcre2_chartables.c.dist instead,
 * which provides standard character tables for the default C locale. */
