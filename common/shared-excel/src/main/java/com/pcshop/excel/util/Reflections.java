package com.pcshop.excel.util;

import java.lang.reflect.Field;
import java.lang.reflect.Modifier;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/** Đọc/ghi field theo tên, có duyệt lớp cha và cache. */
public final class Reflections {

    private static final Map<Class<?>, Map<String, Field>> FIELD_CACHE = new ConcurrentHashMap<>();
    private static final Map<Class<?>, List<Field>> ALL_FIELDS_CACHE = new ConcurrentHashMap<>();
    private static final Field MISSING;

    static {
        try {
            MISSING = Reflections.class.getDeclaredField("MISSING");
        } catch (NoSuchFieldException e) {
            throw new ExceptionInInitializerError(e);
        }
    }

    private Reflections() {
    }

    /** Field theo tên (duyệt cả lớp cha), null nếu không có. */
    public static Field findField(Class<?> clazz, String name) {
        Map<String, Field> fields = FIELD_CACHE.computeIfAbsent(clazz, c -> new ConcurrentHashMap<>());
        Field field = fields.computeIfAbsent(name, n -> {
            for (Class<?> c = clazz; c != null && c != Object.class; c = c.getSuperclass()) {
                try {
                    Field f = c.getDeclaredField(n);
                    f.setAccessible(true);
                    return f;
                } catch (NoSuchFieldException ignored) {
                    // tìm tiếp ở lớp cha
                }
            }
            return MISSING;
        });
        return field == MISSING ? null : field;
    }

    public static Field requireField(Class<?> clazz, String name) {
        Field field = findField(clazz, name);
        if (field == null) {
            throw new IllegalStateException(clazz.getName() + " không có field '" + name + "'");
        }
        return field;
    }

    public static Object get(Object target, String name) {
        return get(requireField(target.getClass(), name), target);
    }

    public static Object get(Field field, Object target) {
        try {
            return field.get(target);
        } catch (IllegalAccessException e) {
            throw new IllegalStateException("Không đọc được field " + field.getName(), e);
        }
    }

    public static void set(Field field, Object target, Object value) {
        try {
            field.set(target, value);
        } catch (IllegalAccessException e) {
            throw new IllegalStateException("Không ghi được field " + field.getName(), e);
        }
    }

    /** Mọi field không static của lớp, lớp cha trước, theo thứ tự khai báo. */
    public static List<Field> allFields(Class<?> clazz) {
        return ALL_FIELDS_CACHE.computeIfAbsent(clazz, c -> {
            List<Class<?>> hierarchy = new ArrayList<>();
            for (Class<?> x = c; x != null && x != Object.class; x = x.getSuperclass()) {
                hierarchy.addFirst(x);
            }
            List<Field> result = new ArrayList<>();
            for (Class<?> x : hierarchy) {
                for (Field f : x.getDeclaredFields()) {
                    if (!Modifier.isStatic(f.getModifiers()) && !f.isSynthetic()) {
                        f.setAccessible(true);
                        result.add(f);
                    }
                }
            }
            return List.copyOf(result);
        });
    }
}
