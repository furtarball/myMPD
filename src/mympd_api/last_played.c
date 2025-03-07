/*
 SPDX-License-Identifier: GPL-3.0-or-later
 myMPD (c) 2018-2022 Juergen Mang <mail@jcgames.de>
 https://github.com/jcorporation/mympd
*/

#include "compile_time.h"
#include "last_played.h"

#include "../lib/filehandler.h"
#include "../lib/jsonrpc.h"
#include "../lib/log.h"
#include "../lib/sds_extras.h"
#include "../lib/utility.h"
#include "../lib/validate.h"
#include "../mpd_client/errorhandler.h"
#include "../mpd_client/search_local.h"
#include "../mpd_client/tags.h"
#include "sticker.h"

#include <errno.h>
#include <inttypes.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>

/**
 * Private definitions
 */

static sds _get_last_played_obj(struct t_partition_state *partition_state, sds buffer, long entity_count,
        long long last_played, const char *uri, sds searchstr, const struct t_tags *tagcols);

/**
 * Public functions
 */

/**
 * Saves the last played list from memory to disc and empties the list in memory
 * @param last_played pointer to last played list in memory
 * @param last_played_count maximum number to last played songs to keep
 * @param workdir working directory
 * @return true on success, else false
 */
bool mympd_api_last_played_file_save(struct t_list *last_played, long last_played_count, sds workdir) {
    MYMPD_LOG_INFO("Saving last_played list to disc");
    sds tmp_file = sdscatfmt(sdsempty(), "%S/state/last_played.XXXXXX", workdir);
    FILE *fp = open_tmp_file(tmp_file);
    if (fp == NULL) {
        FREE_SDS(tmp_file);
        return false;
    }

    int i = 0;
    struct t_list_node *current;
    bool write_rc = true;
    while ((current = list_shift_first(last_played)) != NULL) {
        if (fprintf(fp, "%lld::%s\n", current->value_i, current->key) < 0) {
            MYMPD_LOG_ERROR("Could not write last played songs to disc");
            write_rc = false;
            list_node_free(current);
            break;
        }
        i++;
        list_node_free(current);
    }
    //append current last_played file to tmp file
    sds filepath = sdscatfmt(sdsempty(), "%S/state/last_played", workdir);
    if (write_rc == true) {
        errno = 0;
        FILE *fi = fopen(filepath, OPEN_FLAGS_READ);
        if (fi != NULL) {
            sds line = sdsempty();
            while (sds_getline_n(&line, fi, LINE_LENGTH_MAX) == 0 &&
                i < last_played_count)
            {
                if (fputs(line, fp) == EOF) {
                    MYMPD_LOG_ERROR("Could not write last played songs to disc");
                    write_rc = false;
                    break;
                }
                i++;
            }
            (void) fclose(fi);
            FREE_SDS(line);
        }
        else {
            //ignore error
            MYMPD_LOG_DEBUG("Can not open file \"%s\"", filepath);
            if (errno != ENOENT) {
                MYMPD_LOG_ERRNO(errno);
            }
        }
    }

    bool rc = rename_tmp_file(fp, tmp_file, filepath, write_rc);
    FREE_SDS(tmp_file);
    FREE_SDS(filepath);
    return rc;
}

/**
 * Adds a song from with queue id to the last played list in memory
 * @param partition_state pointer to partition state
 * @param song_id the song id to add
 * @return true on success, else false
 */
bool mympd_api_last_played_add_song(struct t_partition_state *partition_state, int song_id) {
    if (song_id == -1) {
        return false;
    }
    struct mpd_song *song = mpd_run_get_queue_song_id(partition_state->conn, (unsigned)song_id);
    if (song == NULL) {
        MYMPD_LOG_ERROR("Can't get song from id %d", song_id);
        return mympd_check_error_and_recover(partition_state);
    }
    const char *uri = mpd_song_get_uri(song);
    if (is_streamuri(uri) == true) {
        //Don't add streams to last played list
        mpd_song_free(song);
        return true;
    }
    list_insert(&partition_state->mpd_state->last_played, uri, (long long)time(NULL), NULL, NULL);
    mpd_song_free(song);
    //write last_played list to disc
    if (partition_state->mpd_state->last_played.length > 9 ||
        partition_state->mpd_state->last_played.length > partition_state->mpd_state->last_played_count)
    {
        mympd_api_last_played_file_save(&partition_state->mpd_state->last_played,
            partition_state->mpd_state->last_played_count, partition_state->mpd_state->config->workdir);
    }
    //notify clients
    send_jsonrpc_event(JSONRPC_EVENT_UPDATE_LAST_PLAYED);
    return true;
}

/**
 * Prints a jsonrpc response with the last played songs (memory and disc)
 * @param partition_state pointer to partition state
 * @param buffer alreay allocated sds string to append the response
 * @param request_id jsonrpc request id
 * @param offset offset
 * @param limit max number of entries to return
 * @param searchstr string to search
 * @param tagcols columns to print
 * @return pointer to buffer
 */
sds mympd_api_last_played_list(struct t_partition_state *partition_state, sds buffer,
        long request_id, long offset, long limit, sds searchstr, const struct t_tags *tagcols)
{
    enum mympd_cmd_ids cmd_id = MYMPD_API_LAST_PLAYED_LIST;
    long entity_count = 0;
    long entities_returned = 0;

    buffer = jsonrpc_respond_start(buffer, cmd_id, request_id);
    buffer = sdscat(buffer, "\"data\":[");
    sds obj = sdsempty();

    long real_limit = offset + limit;

    if (partition_state->mpd_state->last_played.length > 0) {
        struct t_list_node *current = partition_state->mpd_state->last_played.head;
        while (current != NULL) {
            obj = _get_last_played_obj(partition_state, obj, entity_count, current->value_i, current->key, searchstr, tagcols);
            if (sdslen(obj) > 0) {
                entity_count++;
                if (entity_count > offset &&
                    entity_count <= real_limit)
                {
                    if (entities_returned++) {
                        buffer = sdscatlen(buffer, ",", 1);
                    }
                    buffer = sdscatsds(buffer, obj);
                    sdsclear(obj);
                }
            }
            current = current->next;
        }
    }

    sds line = sdsempty();
    sdsclear(obj);
    char *data = NULL;
    sds lp_file = sdscatfmt(sdsempty(), "%S/state/last_played", partition_state->mpd_state->config->workdir);
    errno = 0;
    FILE *fp = fopen(lp_file, OPEN_FLAGS_READ);
    if (fp != NULL) {
        while (sds_getline(&line, fp, LINE_LENGTH_MAX) == 0) {
            int value = (int)strtoimax(line, &data, 10);
            if (strlen(data) > 2) {
                data = data + 2;
                obj = _get_last_played_obj(partition_state, obj, entity_count, value, data, searchstr, tagcols);
                if (sdslen(obj) > 0) {
                    entity_count++;
                    if (entity_count > offset &&
                        entity_count <= real_limit)
                    {
                        if (entities_returned++) {
                            buffer = sdscatlen(buffer, ",", 1);
                        }
                        buffer = sdscatsds(buffer, obj);
                        sdsclear(obj);
                    }
                }
            }
            else {
                MYMPD_LOG_ERROR("Reading last_played line failed");
                MYMPD_LOG_DEBUG("Errorneous line: %s", line);
            }
        }
        (void) fclose(fp);
        FREE_SDS(line);
    }
    else {
        //ignore error
        MYMPD_LOG_DEBUG("Can not open file \"%s\"", lp_file);
        if (errno != ENOENT) {
            MYMPD_LOG_ERRNO(errno);
        }
    }
    FREE_SDS(lp_file);
    FREE_SDS(obj);
    buffer = sdscatlen(buffer, "],", 2);
    buffer = tojson_long(buffer, "totalEntities", entity_count, true);
    buffer = tojson_long(buffer, "offset", offset, true);
    buffer = tojson_long(buffer, "returnedEntities", entities_returned, false);
    buffer = jsonrpc_end(buffer);

    return buffer;
}

/**
 * Private functions
 */

/**
 * Gets the song and searches for searchstr and prints it as json object
 * @param partition_state pointer to partition state
 * @param buffer alreay allocated buffer to append the result
 * @param entity_count position in the list
 * @param last_played songs last played time as unix timestamp
 * @param uri uri of the song
 * @param searchstr string to search
 * @param tagcols columns to print
 * @return pointer to buffer
 */
static sds _get_last_played_obj(struct t_partition_state *partition_state, sds buffer, long entity_count,
        long long last_played, const char *uri, sds searchstr, const struct t_tags *tagcols)
{
    bool rc = mpd_send_list_meta(partition_state->conn, uri);
    if (mympd_check_rc_error_and_recover(partition_state, rc, "mpd_send_list_meta") == false) {
        return buffer;
    }

    buffer = sdscatlen(buffer, "{", 1);
    buffer = tojson_long(buffer, "Pos", entity_count, true);
    buffer = tojson_llong(buffer, "LastPlayed", last_played, true);
    struct mpd_song *song;
    if ((song = mpd_recv_song(partition_state->conn)) != NULL) {
        if ((rc = search_mpd_song(song, searchstr, tagcols)) == true) {
            buffer = get_song_tags(buffer, partition_state, tagcols, song);
            buffer = sdscatlen(buffer, ",", 1);
            buffer = mympd_api_sticker_list(buffer, &partition_state->mpd_state->sticker_cache, mpd_song_get_uri(song));
        }
        mpd_song_free(song);
    }
    else {
        rc = false;
    }
    mpd_response_finish(partition_state->conn);
    mympd_check_error_and_recover(partition_state);
    buffer = sdscatlen(buffer, "}", 1);
    if (rc == false) {
        sdsclear(buffer);
    }
    return buffer;
}
