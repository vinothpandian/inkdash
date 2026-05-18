#!/usr/bin/env sh
set -eu

PATH_TO_ZERO_NATIVE=${1:-${ZN_PATH:-}}
if [ -z "$PATH_TO_ZERO_NATIVE" ]; then
  echo "ZN_PATH is required" >&2
  exit 1
fi

FILE="$PATH_TO_ZERO_NATIVE/src/platform/linux/gtk_host.c"
if [ ! -f "$FILE" ]; then
  echo "file not found: $FILE" >&2
  exit 0
fi

START=$(grep -n "^typedef struct zero_native_file_dialog_state" "$FILE" | head -n 1 | cut -d: -f1 || true)
END=$(grep -n "^typedef struct zero_native_alert_state" "$FILE" | head -n 1 | cut -d: -f1 || true)
if [ -z "$START" ] || [ -z "$END" ]; then
  echo "expected file dialog markers not found; skipping" >&2
  exit 0
fi

TMP="$FILE.compat"
{
  sed -n "1,$((START-1))p" "$FILE"
  cat <<'EOF2'

typedef struct zero_native_file_dialog_state {
    GMainLoop *loop;
    GListModel *files;
    GFile *file;
} zero_native_file_dialog_state_t;

static GtkWindow *zero_native_parent_window(zero_native_gtk_host_t *host) {
    for (int i = 0; i < host->window_count; i++) {
        if (host->windows[i].gtk_window) return host->windows[i].gtk_window;
    }
    return NULL;
}

static char *zero_native_bytes_to_string(const char *bytes, size_t len) {
    return bytes && len > 0 ? zero_native_strndup(bytes, len) : NULL;
}

#if GTK_CHECK_VERSION(4, 10, 0)

static void zero_native_open_dialog_done(GObject *source, GAsyncResult *result, gpointer data) {
    zero_native_file_dialog_state_t *state = data;
    GError *error = NULL;
    state->files = gtk_file_dialog_open_multiple_finish(GTK_FILE_DIALOG(source), result, &error);
    if (error) g_error_free(error);
    g_main_loop_quit(state->loop);
}

static void zero_native_folder_dialog_done(GObject *source, GAsyncResult *result, gpointer data) {
    zero_native_file_dialog_state_t *state = data;
    GError *error = NULL;
    state->files = gtk_file_dialog_select_multiple_folders_finish(GTK_FILE_DIALOG(source), result, &error);
    if (error) g_error_free(error);
    g_main_loop_quit(state->loop);
}

static void zero_native_save_dialog_done(GObject *source, GAsyncResult *result, gpointer data) {
    zero_native_file_dialog_state_t *state = data;
    GError *error = NULL;
    state->file = gtk_file_dialog_save_finish(GTK_FILE_DIALOG(source), result, &error);
    if (error) g_error_free(error);
    g_main_loop_quit(state->loop);
}

#endif

zero_native_gtk_open_dialog_result_t zero_native_gtk_show_open_dialog(zero_native_gtk_host_t *host, const zero_native_gtk_open_dialog_opts_t *opts, char *buffer, size_t buffer_len) {
    zero_native_gtk_open_dialog_result_t result = {0};
#if GTK_CHECK_VERSION(4, 10, 0)
    GtkFileDialog *dialog = gtk_file_dialog_new();
    char *title = zero_native_bytes_to_string(opts->title, opts->title_len);
    if (title) gtk_file_dialog_set_title(dialog, title);
    GtkWindow *parent = zero_native_parent_window(host);
    zero_native_file_dialog_state_t state = { .loop = g_main_loop_new(NULL, FALSE) };
    if (!state.loop) {
        if (title) free(title);
        g_object_unref(dialog);
        return result;
    }
    if (opts->allow_directories) {
        gtk_file_dialog_select_multiple_folders(dialog, parent, NULL, zero_native_folder_dialog_done, &state);
    } else {
        gtk_file_dialog_open_multiple(dialog, parent, NULL, zero_native_open_dialog_done, &state);
    }
    g_main_loop_run(state.loop);
    g_main_loop_unref(state.loop);
    if (state.files) {
        size_t offset = 0;
        guint count = g_list_model_get_n_items(state.files);
        for (guint i = 0; i < count; i++) {
            GFile *file = G_FILE(g_list_model_get_item(state.files, i));
            char *path = g_file_get_path(file);
            if (path) {
                size_t len = strlen(path);
                size_t needed = len + (result.count > 0 ? 1 : 0);
                if (offset + needed <= buffer_len) {
                    if (result.count > 0) buffer[offset++] = '\n';
                    memcpy(buffer + offset, path, len);
                    offset += len;
                    result.count++;
                }
                g_free(path);
            }
            g_object_unref(file);
        }
        result.bytes_written = offset;
        g_object_unref(state.files);
    }
    if (title) free(title);
    g_object_unref(dialog);
#else
    (void)host;
    (void)opts;
    (void)buffer;
    (void)buffer_len;
    g_warning("zero-native GTK file dialogs are not available with GTK < 4.10");
#endif
    return result;
}

size_t zero_native_gtk_show_save_dialog(zero_native_gtk_host_t *host, const zero_native_gtk_save_dialog_opts_t *opts, char *buffer, size_t buffer_len) {
#if GTK_CHECK_VERSION(4, 10, 0)
    GtkFileDialog *dialog = gtk_file_dialog_new();
    char *title = zero_native_bytes_to_string(opts->title, opts->title_len);
    char *default_name = zero_native_bytes_to_string(opts->default_name, opts->default_name_len);
    if (title) gtk_file_dialog_set_title(dialog, title);
    if (default_name) gtk_file_dialog_set_initial_name(dialog, default_name);
    GtkWindow *parent = zero_native_parent_window(host);
    zero_native_file_dialog_state_t state = { .loop = g_main_loop_new(NULL, FALSE) };
    size_t written = 0;
    if (!state.loop) {
        if (title) free(title);
        if (default_name) free(default_name);
        g_object_unref(dialog);
        return 0;
    }
    gtk_file_dialog_save(dialog, parent, NULL, zero_native_save_dialog_done, &state);
    g_main_loop_run(state.loop);
    g_main_loop_unref(state.loop);
    if (state.file) {
        char *path = g_file_get_path(state.file);
        if (path) {
            size_t len = strlen(path);
            written = len < buffer_len ? len : buffer_len;
            memcpy(buffer, path, written);
            g_free(path);
        }
        g_object_unref(state.file);
    }
    if (title) free(title);
    if (default_name) free(default_name);
    g_object_unref(dialog);
    return written;
#else
    (void)host;
    (void)opts;
    (void)buffer;
    (void)buffer_len;
    g_warning("zero-native GTK save dialog is not available with GTK < 4.10");
    return 0;
#endif
}

EOF2
  sed -n "$END,$((END+999999))p" "$FILE"
} > "$TMP"
mv "$TMP" "$FILE"

ALERT_START=$(grep -n "^typedef struct zero_native_alert_state" "$FILE" | head -n 1 | cut -d: -f1 || true)
if [ -n "$ALERT_START" ]; then
  TMP2="$FILE.alertcompat"
  {
    sed -n "1,$((ALERT_START-1))p" "$FILE"
    cat <<'EOF3'

#if GTK_CHECK_VERSION(4, 10, 0)

typedef struct zero_native_alert_state {
    GMainLoop *loop;
    int response;
} zero_native_alert_state_t;

static void zero_native_alert_done(GObject *source, GAsyncResult *result, gpointer data) {
    zero_native_alert_state_t *state = data;
    GError *error = NULL;
    state->response = gtk_alert_dialog_choose_finish(GTK_ALERT_DIALOG(source), result, &error);
    if (error) {
        g_error_free(error);
        state->response = 0;
    }
    g_main_loop_quit(state->loop);
}

int zero_native_gtk_show_message_dialog(zero_native_gtk_host_t *host, const zero_native_gtk_message_dialog_opts_t *opts) {
    GtkAlertDialog *dialog = gtk_alert_dialog_new(NULL);
    char *title = zero_native_bytes_to_string(opts->title, opts->title_len);
    char *message = zero_native_bytes_to_string(opts->message, opts->message_len);
    char *informative = zero_native_bytes_to_string(opts->informative_text, opts->informative_text_len);
    char *primary = zero_native_bytes_to_string(opts->primary_button, opts->primary_button_len);
    char *secondary = zero_native_bytes_to_string(opts->secondary_button, opts->secondary_button_len);
    char *tertiary = zero_native_bytes_to_string(opts->tertiary_button, opts->tertiary_button_len);
    gtk_alert_dialog_set_message(dialog, title ? title : (message ? message : ""));
    if (informative || (title && message)) gtk_alert_dialog_set_detail(dialog, informative ? informative : message);
    const char *buttons[4] = { primary ? primary : "OK", NULL, NULL, NULL };
    if (secondary) buttons[1] = secondary;
    if (tertiary) buttons[2] = tertiary;
    gtk_alert_dialog_set_buttons(dialog, buttons);
    zero_native_alert_state_t state = { .loop = g_main_loop_new(NULL, FALSE), .response = 0 };
    if (state.loop) {
        gtk_alert_dialog_choose(dialog, zero_native_parent_window(host), NULL, zero_native_alert_done, &state);
        g_main_loop_run(state.loop);
        g_main_loop_unref(state.loop);
    }
    if (title) free(title);
    if (message) free(message);
    if (informative) free(informative);
    if (primary) free(primary);
    if (secondary) free(secondary);
    if (tertiary) free(tertiary);
    g_object_unref(dialog);
    if (state.response <= 0) return 0;
    if (state.response == 1) return 1;
    return 2;
}

#else

int zero_native_gtk_show_message_dialog(zero_native_gtk_host_t *host, const zero_native_gtk_message_dialog_opts_t *opts) {
    (void)host;
    (void)opts;
    g_warning("zero-native message dialogs are not available with GTK < 4.10");
    return 0;
}

#endif
EOF3
  } > "$TMP2"
  mv "$TMP2" "$FILE"
fi
