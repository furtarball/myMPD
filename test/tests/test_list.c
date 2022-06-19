/*
 SPDX-License-Identifier: GPL-3.0-or-later
 myMPD (c) 2018-2022 Juergen Mang <mail@jcgames.de>
 https://github.com/jcorporation/mympd
*/

#include "mympd_config_defs.h"

#include "../../dist/utest/utest.h"
#include "../../src/lib/list.h"

static void populate_list(struct t_list *l) {
    list_init(l);
    list_push(l, "key1", 1, "value1", NULL);
    list_push(l, "key2", 2, "value2", NULL);
    list_push(l, "key3", 3, "value3", NULL);
    list_push(l, "key4", 4, "value4", NULL);
    list_push(l, "key5", 5, "value5", NULL);
    list_insert(l, "key0", 0, "value0", NULL);
}

UTEST(list, test_list_push) {
    struct t_list test_list;
    populate_list(&test_list);

    struct t_list_node *current;

    list_push(&test_list, "last", 6, "value6", NULL);
    ASSERT_STREQ("last", test_list.tail->key);
    ASSERT_EQ(7, test_list.length);
    current = list_node_at(&test_list, test_list.length - 1);
    ASSERT_STREQ(current->key, test_list.tail->key);

    list_clear(&test_list);
}

UTEST(list, test_list_insert) {
    struct t_list test_list;
    populate_list(&test_list);

    struct t_list_node *current;

    list_insert(&test_list, "first", -1, "value-1", NULL);
    ASSERT_STREQ("first", test_list.head->key);
    ASSERT_EQ(7, test_list.length);
    current = list_node_at(&test_list, 0);
    ASSERT_STREQ(current->key, test_list.head->key);

    list_clear(&test_list);
}

UTEST(list, test_remove_node) {
    struct t_list test_list;
    populate_list(&test_list);

    struct t_list_node *current;
    //remove middle item
    list_remove_node(&test_list, 3);
    current = list_node_at(&test_list, 4);
    ASSERT_STREQ("key5", current->key);
    ASSERT_EQ(5, test_list.length);

    //remove last item
    list_remove_node(&test_list, test_list.length - 1);
    ASSERT_STREQ("key4", test_list.tail->key);
    ASSERT_EQ(4, test_list.length);

    //check tail
    current = list_node_at(&test_list, test_list.length - 1);
    ASSERT_STREQ(current->key, test_list.tail->key);

    //remove first item
    list_remove_node(&test_list, 0);
    ASSERT_STREQ("key1", test_list.head->key);
    ASSERT_EQ(3, test_list.length);

    current = list_node_at(&test_list, 0);
    ASSERT_STREQ(current->key, test_list.head->key);

    list_clear(&test_list);
}

UTEST(list, test_list_replace) {
    struct t_list test_list;
    populate_list(&test_list);

    struct t_list_node *current;
    //replace middle item
    list_replace(&test_list, 4, "replace0", 0, NULL, NULL);
    current = list_node_at(&test_list, 4);
    ASSERT_STREQ("replace0", current->key);
    ASSERT_EQ(6, test_list.length);

    //replace last item
    list_replace(&test_list, test_list.length - 1, "replace1", 0, NULL, NULL);
    ASSERT_STREQ("replace1", test_list.tail->key);
    current = list_node_at(&test_list, 5);
    ASSERT_STREQ(current->key, test_list.tail->key);
    ASSERT_EQ(6, test_list.length);

    //replace first item
    list_replace(&test_list, 0, "replace2", 0, NULL, NULL);
    ASSERT_STREQ("replace2", test_list.head->key);
    current = list_node_at(&test_list, 0);
    ASSERT_STREQ(current->key, test_list.head->key);
    ASSERT_EQ(6, test_list.length);

    list_clear(&test_list);
}

UTEST(list, test_list_shuffle) {
    struct t_list test_list;
    list_init(&test_list);
    struct t_list_node *current;

    list_shuffle(&test_list);
    bool shuffled = false;
    for (unsigned i = 0; i < test_list.length; i++) {
        current = list_node_at(&test_list, i);
        if (current->value_i != (int)i) {
            shuffled = true;
        }
    }
    ASSERT_FALSE(shuffled);
    list_clear(&test_list);
}

UTEST(list, test_list_swap_item_pos) {
    struct t_list test_list;
    populate_list(&test_list);

    struct t_list_node *current;

    list_swap_item_pos(&test_list, 3, 1);
    current = list_node_at(&test_list, 1);
    ASSERT_STREQ("key3", current->key);
    current = list_node_at(&test_list, 3);
    ASSERT_STREQ("key1", current->key);

    ASSERT_EQ(6, test_list.length);

    list_clear(&test_list);
}

UTEST(list, test_list_move_item_pos) {
    struct t_list test_list;
    populate_list(&test_list);

    struct t_list_node *current;

    list_move_item_pos(&test_list, 4, 2);
    current = list_node_at(&test_list, 2);
    ASSERT_STREQ("key4", current->key);
    current = list_node_at(&test_list, 4);
    ASSERT_STREQ("key3", current->key);

    ASSERT_EQ(6, test_list.length);

    list_clear(&test_list);
}
