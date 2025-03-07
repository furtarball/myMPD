/*
 SPDX-License-Identifier: GPL-3.0-or-later
 myMPD (c) 2018-2022 Juergen Mang <mail@jcgames.de>
 https://github.com/jcorporation/mympd
*/

#ifndef MYMPD_MPD_CLIENT_CONNECTION_H
#define MYMPD_MPD_CLIENT_CONNECTION_H

#include "../lib/mympd_state.h"

bool mpd_client_connect(struct t_partition_state *partition_state);
bool mpd_client_set_keepalive(struct t_partition_state *partition_state);
bool mpd_client_set_binarylimit(struct t_partition_state *partition_state);
void mpd_client_disconnect(struct t_partition_state *partition_state);
#endif
