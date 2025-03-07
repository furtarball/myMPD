/*
 SPDX-License-Identifier: GPL-3.0-or-later
 myMPD (c) 2018-2022 Juergen Mang <mail@jcgames.de>
 https://github.com/jcorporation/mympd
*/

#include "compile_time.h"
#include "api.h"

#include "../lib/jsonrpc.h"
#include "../lib/log.h"
#include "../lib/sds_extras.h"
#include "cache.h"
#include "smartpls.h"

#include <stdlib.h>

/**
 * Handler for mpd worker api requests
 * @param mpd_worker_state pointer to mpd_worker_state struct
 */
void mpd_worker_api(struct t_mpd_worker_state *mpd_worker_state) {
    struct t_work_request *request = mpd_worker_state->request;
    bool rc;
    bool bool_buf1;
    bool async = false;
    sds sds_buf1 = NULL;

    MYMPD_LOG_INFO("MPD WORKER API request (%lld)(%ld) %s: %s", request->conn_id, request->id, request->method, request->data);
    //create response struct
    struct t_work_response *response = create_response(request);

    switch(request->cmd_id) {
        case MYMPD_API_SMARTPLS_UPDATE_ALL:
            if (mpd_worker_state->smartpls == false) {
                response->data = jsonrpc_respond_message(response->data, request->cmd_id, request->id,
                    JSONRPC_FACILITY_PLAYLIST, JSONRPC_SEVERITY_ERROR, "Smart playlists are disabled");
                break;
            }
            if (json_get_bool(request->data, "$.params.force", &bool_buf1, NULL) == true) {
                response->data = jsonrpc_respond_message(response->data, request->cmd_id, request->id,
                    JSONRPC_FACILITY_PLAYLIST, JSONRPC_SEVERITY_INFO, "Smart playlists update started");
                if (request->conn_id > -1) {
                    MYMPD_LOG_DEBUG("Push response to queue for connection %lld: %s", request->conn_id, response->data);
                    mympd_queue_push(web_server_queue, response, 0);
                }
                else {
                    free_response(response);
                }
                free_request(request);
                rc = mpd_worker_smartpls_update_all(mpd_worker_state, bool_buf1);
                if (rc == true) {
                    send_jsonrpc_notify(JSONRPC_FACILITY_PLAYLIST, JSONRPC_SEVERITY_INFO, "Smart playlists updated");
                }
                else {
                    send_jsonrpc_notify(JSONRPC_FACILITY_PLAYLIST, JSONRPC_SEVERITY_ERROR, "Smart playlists update failed");
                }
                async = true;
            }
            break;
        case MYMPD_API_SMARTPLS_UPDATE:
            if (mpd_worker_state->smartpls == false) {
                response->data = jsonrpc_respond_message(response->data, request->cmd_id, request->id,
                    JSONRPC_FACILITY_PLAYLIST, JSONRPC_SEVERITY_ERROR, "Smart playlists are disabled");
                break;
            }
            if (json_get_string(request->data, "$.params.plist", 1, 200, &sds_buf1, vcb_isfilename, NULL) == true) {
                rc = mpd_worker_smartpls_update(mpd_worker_state, sds_buf1);
                if (rc == true) {
                    response->data = jsonrpc_respond_message_phrase(response->data, request->cmd_id, request->id,
                        JSONRPC_FACILITY_PLAYLIST, JSONRPC_SEVERITY_INFO, "Smart playlist %{playlist} updated", 2, "playlist", sds_buf1);
                    //notify client
                    //send mpd event manually as fallback if mpd playlist is not created (no songs are found)
                    send_jsonrpc_event(JSONRPC_EVENT_UPDATE_STORED_PLAYLIST);
                }
                else {
                    response->data = jsonrpc_respond_message_phrase(response->data, request->cmd_id, request->id,
                        JSONRPC_FACILITY_PLAYLIST, JSONRPC_SEVERITY_ERROR, "Updating smart playlist %{playlist} failed", 2, "playlist", sds_buf1);
                }
            }
            break;
        case INTERNAL_API_CACHES_CREATE:
            mpd_worker_cache_init(mpd_worker_state);
            async = true;
            free_request(request);
            free_response(response);
            break;
        default:
            response->data = jsonrpc_respond_message(response->data, request->cmd_id, request->id,
                JSONRPC_FACILITY_GENERAL, JSONRPC_SEVERITY_ERROR, "Unknown request");
            MYMPD_LOG_ERROR("Unknown API request: %.*s", (int)sdslen(request->data), request->data);
    }
    FREE_SDS(sds_buf1);

    if (async == true) {
        return;
    }

    if (sdslen(response->data) == 0) {
        response->data = jsonrpc_respond_message_phrase(response->data, request->cmd_id, request->id,
            JSONRPC_FACILITY_GENERAL, JSONRPC_SEVERITY_ERROR, "No response for method %{method}", 2, "method", request->method);
        MYMPD_LOG_ERROR("No response for method \"%s\"", request->method);
    }
    if (request->conn_id == -2) {
        MYMPD_LOG_DEBUG("Push response to mympd_script_queue for thread %ld: %s", request->id, response->data);
        mympd_queue_push(mympd_script_queue, response, request->id);
    }
    else if (request->conn_id > -1) {
        MYMPD_LOG_DEBUG("Push response to queue for connection %lld: %s", request->conn_id, response->data);
        mympd_queue_push(web_server_queue, response, 0);
    }
    else {
        free_response(response);
    }
    free_request(request);
}
